// Crossing this root layout reloads the document, removing GTM and its listeners before
// private routes open and restoring analytics only after a fresh public-page request.
export { default, generateMetadata, generateStaticParams } from "../../[locale]/layout";
