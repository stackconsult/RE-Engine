interface ScrapeArgs {
    url: string;
    goal?: string;
    browser_profile?: 'lite' | 'stealth';
    proxy_config?: {
        enabled: boolean;
        country_code?: string;
    };
}
export declare const scrape: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            url: {
                type: string;
                description: string;
            };
            goal: {
                type: string;
                description: string;
            };
            browser_profile: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            proxy_config: {
                type: string;
                properties: {
                    enabled: {
                        type: string;
                        description: string;
                    };
                    country_code: {
                        type: string;
                        description: string;
                    };
                };
                description: string;
            };
        };
        required: string[];
    };
    tool: {
        name: string;
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                url: {
                    type: string;
                    description: string;
                };
                goal: {
                    type: string;
                    description: string;
                };
                browser_profile: {
                    type: string;
                    enum: string[];
                    description: string;
                    default: string;
                };
                proxy_config: {
                    type: string;
                    properties: {
                        enabled: {
                            type: string;
                            description: string;
                        };
                        country_code: {
                            type: string;
                            description: string;
                        };
                    };
                    description: string;
                };
            };
            required: string[];
        };
    };
    handler: (args: ScrapeArgs) => Promise<any>;
};
export {};
//# sourceMappingURL=scrape.d.ts.map