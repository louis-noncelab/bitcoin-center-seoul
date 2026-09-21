import { ButtonSpinner } from "@/components/ui/button-spinner";

export default function Loading() {
  return <div className="container detail-page" aria-busy="true"><ButtonSpinner /></div>;
}
