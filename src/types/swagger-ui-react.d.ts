declare module "swagger-ui-react/swagger-ui.css";

declare module "swagger-ui-bundle" {
  export type SwaggerUIBundleOptions = {
    url: string;
    domNode: HTMLElement;
  };

  export type SwaggerUISystem = {
    destroy?: () => void;
  };

  const SwaggerUIBundle: (options: SwaggerUIBundleOptions) => SwaggerUISystem;

  export default SwaggerUIBundle;
}
