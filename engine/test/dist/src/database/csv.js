/**
 * CSV Database Connection
 * Provides database-like interface for CSV file storage
 */
import fs from 'fs/promises';
import path from 'path';
export class CSVConnection {
    dataDir;
    cache = new Map();
    constructor(config) {
        this.dataDir = config.dataDir;
    }
    async connect() {
        // Ensure data directory exists
        try {
            await fs.access(this.dataDir);
        }
        catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }
    }
    async disconnect() {
        this.cache.clear();
    }
    async health() {
        try {
            await fs.access(this.dataDir);
            return true;
        }
        catch {
            return false;
        }
    }
    async query(sql, params) {
        console.log('CSV Query:', sql, params);
        // Simple SQL-like query parser for CSV operations
        const trimmedSql = sql.trim().toLowerCase();
        if (trimmedSql.startsWith('select')) {
            return this.handleSelect(trimmedSql, params);
        }
        else if (trimmedSql.startsWith('insert')) {
            return this.handleInsert(trimmedSql, params);
        }
        else if (trimmedSql.startsWith('update')) {
            return this.handleUpdate(trimmedSql, params);
        }
        else if (trimmedSql.startsWith('delete')) {
            return this.handleDelete(trimmedSql, params);
        }
        else {
            console.error('Unsupported SQL:', sql);
            throw new Error(`Unsupported SQL operation: ${sql}`);
        }
    }
    async transaction(callback) {
        // For CSV, we'll just run the callback - no real transaction support
        return callback(this);
    }
    async handleSelect(sql, params) {
        const match = sql.match(/select\s+\*\s+from\s+(\w+)/i);
        if (!match) {
            throw new Error('Invalid SELECT syntax');
        }
        const tableName = match[1];
        const data = await this.loadCSV(tableName);
        // Simple WHERE clause support
        if (sql.includes('where')) {
            const whereMatch = sql.match(/where\s+(.+?)(?:\s+order\s+by|\s+limit|$)/i);
            if (whereMatch) {
                return this.filterData(data, whereMatch[1], params);
            }
        }
        return data;
    }
    async handleInsert(sql, params) {
        const match = sql.match(/insert\s+into\s+(\w+)\s+\(([^)]+)\)\s+values\s+\(([^)]+)\)/i);
        if (!match) {
            throw new Error('Invalid INSERT syntax');
        }
        const tableName = match[1];
        const columns = match[2].split(',').map(c => c.trim());
        const values = params || [];
        if (columns.length !== values.length) {
            throw new Error('Column count does not match value count');
        }
        const record = {};
        columns.forEach((col, index) => {
            record[col] = values[index];
        });
        // Add timestamps
        record.created_at = new Date().toISOString();
        record.updated_at = new Date().toISOString();
        const data = await this.loadCSV(tableName);
        data.push(record);
        await this.saveCSV(tableName, data);
        return record;
    }
    async handleUpdate(sql, params) {
        const match = sql.match(/update\s+(\w+)\s+set\s+(.+?)\s+where\s+(.+)/i);
        if (!match) {
            throw new Error('Invalid UPDATE syntax');
        }
        const tableName = match[1];
        const setClause = match[2];
        const whereClause = match[3];
        const data = await this.loadCSV(tableName);
        const filteredData = this.filterData(data, whereClause, params);
        // Parse SET clause
        const setPairs = setClause.split(',').map(pair => pair.trim());
        const updates = {};
        setPairs.forEach(pair => {
            const [key, value] = pair.split('=').map(s => s.trim());
            updates[key] = value.replace(/['"]/g, '');
        });
        // Update filtered records
        filteredData.forEach(record => {
            Object.assign(record, updates);
            record.updated_at = new Date().toISOString();
        });
        await this.saveCSV(tableName, data);
        return filteredData;
    }
    async handleDelete(sql, params) {
        const match = sql.match(/delete\s+from\s+(\w+)\s+where\s+(.+)/i);
        if (!match) {
            throw new Error('Invalid DELETE syntax');
        }
        const tableName = match[1];
        const whereClause = match[2];
        const data = await this.loadCSV(tableName);
        const filteredData = this.filterData(data, whereClause, params);
        const remainingData = data.filter(record => !filteredData.includes(record));
        await this.saveCSV(tableName, remainingData);
        return filteredData.length;
    }
    async loadCSV(tableName) {
        const cacheKey = tableName;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        try {
            const filePath = path.join(this.dataDir, `${tableName}.csv`);
            const content = await fs.readFile(filePath, 'utf-8');
            const records = [];
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length <= 1) {
                this.cache.set(cacheKey, records);
                return records;
            }
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const record = {};
                headers.forEach((header, index) => {
                    record[header] = values[index] || '';
                });
                records.push(record);
            }
            this.cache.set(cacheKey, records);
            return records;
        }
        catch (error) {
            // File doesn't exist or is empty
            this.cache.set(cacheKey, []);
            return [];
        }
    }
    async saveCSV(tableName, data) {
        const filePath = path.join(this.dataDir, `${tableName}.csv`);
        if (data.length === 0) {
            await fs.writeFile(filePath, '');
            return;
        }
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(record => headers.map(header => {
                const value = record[header] || '';
                return typeof value === 'string' && value.includes(',')
                    ? `"${value}"`
                    : value;
            }).join(','))
        ].join('\n');
        await fs.writeFile(filePath, csvContent, 'utf-8');
        this.cache.set(tableName, data);
    }
    filterData(data, whereClause, params) {
        // Simple WHERE clause parsing
        let resolvedClause = whereClause;
        if (params && params.length > 0) {
            let paramIndex = 0;
            resolvedClause = whereClause.replace(/\?/g, () => {
                const val = params[paramIndex++];
                return typeof val === 'string' ? `'${val}'` : String(val);
            });
        }
        const conditions = resolvedClause.split('and').map(cond => cond.trim());
        return data.filter(record => {
            return conditions.every(condition => {
                const [field, operator, value] = condition.split(/\s+/);
                const recordValue = record[field];
                switch (operator) {
                    case '=':
                        return recordValue === value.replace(/['"]/g, '');
                    case 'like':
                        return recordValue.includes(value.replace(/['"]/g, '').replace(/%/g, ''));
                    case '>':
                        return Number(recordValue) > Number(value);
                    case '<':
                        return Number(recordValue) < Number(value);
                    default:
                        return true;
                }
            });
        });
    }
}
//# sourceMappingURL=csv.js.map