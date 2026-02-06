#!/bin/bash

# RE Engine System-Aware Ollama Deployment Script
# Automatically detects system and deploys compatible Ollama version

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# System detection functions
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

detect_macos_version() {
    if [[ "$(detect_os)" != "macos" ]]; then
        echo ""
        return
    fi
    
    local version
    version=$(sw_vers -productVersion 2>/dev/null || echo "")
    echo "$version"
}

detect_architecture() {
    local arch
    arch=$(uname -m 2>/dev/null || echo "unknown")
    case "$arch" in
        x86_64) echo "amd64" ;;
        arm64|aarch64) echo "arm64" ;;
        *) echo "$arch" ;;
    esac
}

# Version compatibility mapping
get_compatible_ollama_version() {
    local os="$1"
    local macos_version="$2"
    local arch="$3"
    
    case "$os" in
        "macos")
            # Map macOS versions to compatible Ollama versions
            if [[ -n "$macos_version" ]]; then
                local major_version
                major_version=$(echo "$macos_version" | cut -d. -f1)
                local minor_version
                minor_version=$(echo "$macos_version" | cut -d. -f2)
                
                # Monterey (12) and older need older Ollama versions
                if [[ "$major_version" -le 12 ]]; then
                    if [[ "$minor_version" -le 7 ]]; then
                        # Monterey 12.7 and older - use 0.13.5 (last compatible version)
                        echo "0.13.5"
                        return
                    fi
                fi
            fi
            # Ventura (13) and newer can use latest
            echo "latest"
            ;;
        "linux")
            echo "latest"
            ;;
        "windows")
            echo "latest"
            ;;
        *)
            echo "latest"
            ;;
    esac
}

# Download functions
download_ollama() {
    local version="$1"
    local os="$2"
    local arch="$3"
    
    local download_url
    local filename
    
    log_info "Downloading Ollama $version for $os-$arch"
    
    if [[ "$version" == "latest" ]]; then
        # Get latest version from GitHub API
        local latest_version
        latest_version=$(curl -s "https://api.github.com/repos/ollama/ollama/releases/latest" | grep '"tag_name":' | sed -E 's/.*"tag_name": "v?([^"]+).*/\1/')
        version="$latest_version"
        log_info "Latest version detected: $version"
    fi
    
    # Construct download URL based on OS and architecture
    case "$os" in
        "macos")
            if [[ "$version" == "0.13.5" ]] || [[ $(echo "$version" | sed 's/\.//g') -lt 0140 ]]; then
                # Older versions use tar.gz format (not architecture-specific)
                download_url="https://github.com/ollama/ollama/releases/download/v${version}/ollama-darwin.tgz"
                filename="ollama-darwin.tgz"
            else
                # Newer versions use DMG
                download_url="https://github.com/ollama/ollama/releases/download/v${version}/Ollama-darwin.dmg"
                filename="Ollama-darwin.dmg"
            fi
            ;;
        "linux")
            download_url="https://github.com/ollama/ollama/releases/download/v${version}/ollama-linux-${arch}.tgz"
            filename="ollama-linux-${arch}.tgz"
            ;;
        "windows")
            download_url="https://github.com/ollama/ollama/releases/download/v${version}/OllamaSetup.exe"
            filename="OllamaSetup.exe"
            ;;
        *)
            log_error "Unsupported OS: $os"
            return 1
            ;;
    esac
    
    log_info "Download URL: $download_url"
    
    # Create temporary directory
    local temp_dir
    temp_dir=$(mktemp -d)
    local file_path="$temp_dir/$filename"
    
    # Download with retry logic
    local max_retries=3
    local retry_count=0
    
    while [[ $retry_count -lt $max_retries ]]; do
        log_info "Downloading... (Attempt $((retry_count + 1))/$max_retries)"
        
        if curl -L --progress-bar --retry 2 --retry-delay 1 --max-time 300 \
            -o "$file_path" \
            "$download_url" 2>/dev/null; then
            log_success "Download completed successfully"
            break
        else
            retry_count=$((retry_count + 1))
            if [[ $retry_count -eq $max_retries ]]; then
                log_error "Download failed after $max_retries attempts"
                rm -rf "$temp_dir"
                return 1
            fi
            log_warning "Download failed, retrying..."
            sleep 2
        fi
    done
    
    # Verify download
    if [[ ! -f "$file_path" ]] || [[ ! -s "$file_path" ]]; then
        log_error "Download verification failed"
        rm -rf "$temp_dir"
        return 1
    fi
    
    echo "$file_path"
}

# Installation functions
install_ollama_macos() {
    local file_path="$1"
    local version="$2"
    
    log_info "Installing Ollama on macOS"
    
    if [[ "$file_path" == *.dmg ]]; then
        # Install from DMG
        log_info "Mounting DMG..."
        local mount_point
        mount_point=$(hdiutil attach "$file_path" | grep "/Volumes" | awk '{print $3}')
        
        if [[ -z "$mount_point" ]]; then
            log_error "Failed to mount DMG"
            return 1
        fi
        
        log_info "Copying application..."
        if cp -R "$mount_point/Ollama.app" /Applications/; then
            log_success "Application copied to /Applications/"
        else
            log_error "Failed to copy application"
            hdiutil detach "$mount_point" 2>/dev/null || true
            return 1
        fi
        
        hdiutil detach "$mount_point" 2>/dev/null || true
        
    elif [[ "$file_path" == *.tgz ]]; then
        # Install from tar.gz (older versions)
        log_info "Extracting tar.gz..."
        local temp_dir
        temp_dir=$(mktemp -d)
        
        if ! tar -xzf "$file_path" -C "$temp_dir"; then
            log_error "Failed to extract archive"
            rm -rf "$temp_dir"
            return 1
        fi
        
        log_info "Installing binary..."
        # Check for ollama binary in various locations
        local ollama_binary=""
        if [[ -f "$temp_dir/ollama" ]]; then
            ollama_binary="$temp_dir/ollama"
        elif [[ -f "$temp_dir/bin/ollama" ]]; then
            ollama_binary="$temp_dir/bin/ollama"
        else
            # Find the binary
            ollama_binary=$(find "$temp_dir" -name "ollama" -type f | head -1)
        fi
        
        if [[ -n "$ollama_binary" && -f "$ollama_binary" ]]; then
            sudo mkdir -p /usr/local/bin
            sudo cp "$ollama_binary" /usr/local/bin/
            sudo chmod +x /usr/local/bin/ollama
            log_success "Binary installed to /usr/local/bin/ollama"
        else
            log_error "Ollama binary not found in archive"
            rm -rf "$temp_dir"
            return 1
        fi
        
        rm -rf "$temp_dir"
    else
        log_error "Unsupported file format for macOS"
        return 1
    fi
}

install_ollama_linux() {
    local file_path="$1"
    
    log_info "Installing Ollama on Linux"
    
    local temp_dir
    temp_dir=$(mktemp -d)
    
    if ! tar -xzf "$file_path" -C "$temp_dir"; then
        log_error "Failed to extract archive"
        rm -rf "$temp_dir"
        return 1
    fi
    
    if [[ -f "$temp_dir/ollama" ]]; then
        sudo mkdir -p /usr/local/bin
        sudo cp "$temp_dir/ollama" /usr/local/bin/
        sudo chmod +x /usr/local/bin/ollama
        log_success "Binary installed to /usr/local/bin/ollama"
    else
        log_error "Ollama binary not found in archive"
        rm -rf "$temp_dir"
        return 1
    fi
    
    rm -rf "$temp_dir"
}

# Validation functions
validate_installation() {
    local os="$1"
    
    log_info "Validating Ollama installation..."
    
    # Check if ollama command is available
    if ! command -v ollama &> /dev/null; then
        log_error "Ollama command not found in PATH"
        return 1
    fi
    
    # Get version
    local installed_version
    installed_version=$(ollama version 2>/dev/null | head -1 || echo "unknown")
    log_success "Ollama installed: $installed_version"
    
    # Test server startup (non-blocking)
    log_info "Testing server startup..."
    
    # Start server in background
    ollama serve &
    local server_pid=$!
    
    # Wait for server to start
    local max_wait=30
    local wait_count=0
    
    while [[ $wait_count -lt $max_wait ]]; do
        if curl -s http://localhost:11434/api/version &> /dev/null; then
            log_success "Server is running and responding"
            kill $server_pid 2>/dev/null || true
            wait $server_pid 2>/dev/null || true
            return 0
        fi
        sleep 1
        wait_count=$((wait_count + 1))
    done
    
    # Clean up server process
    kill $server_pid 2>/dev/null || true
    wait $server_pid 2>/dev/null || true
    
    log_error "Server failed to start within $max_wait seconds"
    return 1
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf /tmp/ollama-deploy-* 2>/dev/null || true
}

# Main installation function
install_ollama() {
    local os
    local macos_version
    local arch
    local version
    local file_path
    
    # Detect system information
    os=$(detect_os)
    macos_version=$(detect_macos_version)
    arch=$(detect_architecture)
    
    log_info "System detected: $os $macos_version ($arch)"
    
    # Get compatible version
    version=$(get_compatible_ollama_version "$os" "$macos_version" "$arch")
    
    # Log macOS version info separately
    if [[ "$os" == "macos" && -n "$macos_version" ]]; then
        local major_version
        major_version=$(echo "$macos_version" | cut -d. -f1)
        local minor_version
        minor_version=$(echo "$macos_version" | cut -d. -f2)
        log_info "Detected macOS $major_version.$minor_version"
    fi
    
    log_info "Compatible Ollama version: $version"
    
    # Check if already installed
    if command -v ollama &> /dev/null; then
        local current_version
        current_version=$(ollama version 2>/dev/null | head -1 || echo "unknown")
        log_info "Ollama already installed: $current_version"
        
        if [[ "$version" != "latest" ]] && [[ ! "$current_version" =~ $version ]]; then
            log_warning "Current version may not be compatible. Consider reinstalling."
            read -p "Do you want to reinstall? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Skipping installation"
                return 0
            fi
        else
            log_success "Compatible version already installed"
            return 0
        fi
    fi
    
    # Download Ollama
    file_path=$(download_ollama "$version" "$os" "$arch")
    if [[ $? -ne 0 ]] || [[ -z "$file_path" ]]; then
        log_error "Failed to download Ollama"
        return 1
    fi
    
    log_info "Downloaded: $file_path"
    
    # Install based on OS
    case "$os" in
        "macos")
            install_ollama_macos "$file_path" "$version"
            ;;
        "linux")
            install_ollama_linux "$file_path"
            ;;
        "windows")
            log_error "Windows installation not implemented in this script"
            log_info "Please download and run: $file_path"
            return 1
            ;;
        *)
            log_error "Unsupported OS: $os"
            return 1
            ;;
    esac
    
    if [[ $? -ne 0 ]]; then
        log_error "Installation failed"
        return 1
    fi
    
    # Clean up download
    rm -f "$file_path"
    
    # Validate installation
    if validate_installation "$os"; then
        log_success "Ollama installation completed successfully!"
        log_info "You can now run: ollama --version"
        return 0
    else
        log_error "Installation validation failed"
        return 1
    fi
}

# Error handling
trap cleanup EXIT

# Main execution
main() {
    log_info "Starting system-aware Ollama deployment..."
    
    # Check prerequisites
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v tar &> /dev/null; then
        log_error "tar is required but not installed"
        exit 1
    fi
    
    # Run installation
    if install_ollama; then
        log_success "Deployment completed successfully!"
        
        # Offer to pull a model
        echo
        read -p "Do you want to pull a recommended model (qwen:7b)? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Pulling qwen:7b model..."
            if ollama pull qwen:7b; then
                log_success "Model pulled successfully!"
            else
                log_warning "Failed to pull model, you can do it later with: ollama pull qwen:7b"
            fi
        fi
        
        echo
        log_success "Ollama is ready to use!"
        log_info "Start the server with: ollama serve"
        log_info "Test with: curl http://localhost:11434/api/tags"
        
    else
        log_error "Deployment failed"
        exit 1
    fi
}

# Run main function
main "$@"
