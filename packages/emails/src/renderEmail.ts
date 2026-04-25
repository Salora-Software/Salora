import { render } from "@react-email/components";
import * as templates from "../templates";

type TemplateComponent = React.FunctionComponent<any>;

async function renderEmail<K extends keyof typeof templates>(
  template: K,
  props: React.ComponentProps<(typeof templates)[K] & TemplateComponent>,
) {
  const component = await Promise.resolve(
    (templates[template] as React.FunctionComponent<typeof props>)(props),
  );
  return render(component);
}

export default renderEmail;
