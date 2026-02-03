import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface RequestItemProps {
  request: {
    id: string;
    company_name: string;
    created_at: string;
    status: string;
    profiles?: {
      name: string;
      email: string;
      phone?: string;
    } | null;
  };
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  loading?: boolean;
}

export const RequestItem: React.FC<RequestItemProps> = ({
  request,
  onApprove,
  onReject,
  loading = false,
}) => {
  // Handle empty strings properly - trim and check if meaningful
  const requesterName = request.profiles?.name?.trim() || "Unknown User";
  const requesterEmail = request.profiles?.email?.trim() || "No email";
  const timeAgo = formatDistanceToNow(new Date(request.created_at), { addSuffix: true });
  const isAccepted = request.status === "approved";
  const isPending = request.status === "pending" || request.status === "email_sent";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-sm">{requesterName}</h4>
              <p className="text-xs text-muted-foreground">{requesterEmail}</p>
            </div>
            {/* Status Badge */}
            {isAccepted ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                Accepted
              </Badge>
            ) : isPending ? (
              <Badge variant="secondary">Pending</Badge>
            ) : null}
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground">
              Requested: <span className="font-medium">{request.company_name}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
          </div>

          {/* Action Buttons - Hide for accepted requests */}
          {!isAccepted && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => onApprove(request.id)}
                disabled={loading}
                className="flex-1"
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(request.id)}
                disabled={loading}
                className="flex-1"
              >
                Ignore
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


