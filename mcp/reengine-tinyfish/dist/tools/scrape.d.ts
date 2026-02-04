export declare const scrapeTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            url: {
                type: string;
                description: string;
            };
            extract: {
                type: string;
                enum: string[];
                description: string;
            };
            selector: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (args: any) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
};
//# sourceMappingURL=scrape.d.ts.map