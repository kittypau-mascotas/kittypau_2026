import KittypauErrorScreen from "@/app/_components/kittypau-error-screen";
import { parseKittypauErrorType } from "@/lib/errors/kittypau-error";

export default function ErrorPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = searchParams ?? {};
  const rawType = Array.isArray(params.type) ? params.type[0] : params.type;
  const type = parseKittypauErrorType(rawType);

  return <KittypauErrorScreen type={type} />;
}
