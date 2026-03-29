import { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { GroupSummary } from "@/components/demo/types";

type GroupsPanelProps = {
  groups: GroupSummary[];
  selectedGroupId: string;
  groupName: string;
  onGroupNameChange: (value: string) => void;
  onCreateGroup: (event: FormEvent<HTMLFormElement>) => void;
  onSelectGroup: (groupId: string) => void;
};

export function GroupsPanel({
  groups,
  selectedGroupId,
  groupName,
  onGroupNameChange,
  onCreateGroup,
  onSelectGroup,
}: GroupsPanelProps) {
  return (
    <div className="rounded border p-4">
      <h2 className="mb-2 font-medium">Groups</h2>
      <form onSubmit={onCreateGroup} className="mb-3 flex gap-2">
        <input
          className="w-full rounded border p-2"
          placeholder="new group"
          value={groupName}
          onChange={(event) => onGroupNameChange(event.target.value)}
        />
        <Button type="submit">Create</Button>
      </form>
      <div className="flex flex-col gap-2">
        {groups.map((group) => (
          <button
            key={group.id}
            className={`rounded border p-2 text-left ${
              selectedGroupId === group.id ? "bg-muted" : ""
            }`}
            onClick={() => onSelectGroup(group.id)}
            type="button"
          >
            <div className="font-medium">{group.name}</div>
            <div className="text-xs text-muted-foreground">
              keyVersion={group.keyVersion} members={group.memberIds.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {group.isCurrentMember
                ? "You are in this group"
                : "You are not in this group"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
