export function replaceVariables(template: string, data: Record<string, any>): string {
	return template.replace(/{{\s*([\w.]+)\s*}}/g, (match, key) => {
		return key
			.split('.')
			.reduce((obj: any, k: any) => (obj && obj[k] !== undefined ? obj[k] : ''), data);
	});
}
