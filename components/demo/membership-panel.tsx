import { Button } from "@/components/ui/button";
import { GroupSummary, UserSummary } from "@/components/demo/types";

type MembershipPanelProps = {
  users: UserSummary[];
  targetUserId: string;
  onTargetUserChange: (value: string) => void;
  onAddMember: () => void;
  onRemoveMember: () => void;
  selectedGroup: GroupSummary | null;
  availableUsersCount: number;
  removableUsersCount: number;
};

export function MembershipPanel({
  users,
  targetUserId,
  onTargetUserChange,
  onAddMember,
  onRemoveMember,
  selectedGroup,
  availableUsersCount,
  removableUsersCount,
}: MembershipPanelProps) {
  return (
    <div className="rounded border p-4">
      <h2 className="mb-2 font-medium">Membership</h2>
      <select
        className="mb-2 w-full rounded border p-2"
        value={targetUserId}
        onChange={(event) => onTargetUserChange(event.target.value)}
      >
        <option value="">Select user</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.username}
          </option>
        ))}
      </select>
      <div className="mb-2 flex gap-2">
        <Button
          type="button"
          onClick={onAddMember}
          disabled={!selectedGroup || availableUsersCount === 0}
        >
          Add member
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onRemoveMember}
          disabled={!selectedGroup || removableUsersCount === 0}
        >
          Remove member
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Use two browser tabs with different logins to demonstrate independent
        sessions.
      </p>
    </div>
  );
}
