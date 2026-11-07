import { Badge } from "@/components/ui/badge";
import { STATUS_CONTA, type StatusConta } from "@/lib/constantes";

export function BadgeStatus({ status }: { status: StatusConta }) {
  const { rotulo, badge } = STATUS_CONTA[status];
  return <Badge variant={badge}>{rotulo}</Badge>;
}
