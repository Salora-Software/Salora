import { render } from '@react-email/components';
import * as templates from '../templates';

async function renderEmail<K extends keyof typeof templates>(
	template: K,
	props: React.ComponentProps<(typeof templates)[K]>
) {
	const Component = templates[template];
	// return (
	// 	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// 	// @ts-expect-error
	// 	ReactDOMServer.renderToStaticMarkup(Component(props))
	// 		// Remove `<RawHtml />` injected scripts
	// 		.replace(/<script><\/script>/g, '')
	// 		.replace(
	// 			'<html>',
	// 			`<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">`
	// 		)
	// );
	const component = await Promise.resolve(
		(templates[template] as React.FunctionComponent<typeof props>)(props)
	);
	return render(component);
}

export default renderEmail;
