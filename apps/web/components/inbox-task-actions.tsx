"use client";

import * as React from "react";
import { IconButton, Menu, Portal } from "@chakra-ui/react";
import { MoreVertical } from "lucide-react";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { InboxTaskForm } from "./inbox-task-form";

type InboxTaskActionsProps = {
  taskId: string;
  title: string;
  remainingMinutes: number;
  dueDate: string | null;
  done: boolean;
  notes: string;
};

export function InboxTaskActions({
  taskId,
  title,
  remainingMinutes,
  dueDate,
  done,
  notes,
}: InboxTaskActionsProps) {
  const [dialog, setDialog] = React.useState<"edit" | "delete" | null>(null);

  return (
    <>
      <Menu.Root positioning={{ placement: "bottom-end" }}>
        <Menu.Trigger asChild>
          <IconButton aria-label={`${title} の操作`} variant="ghost" size="sm">
            <MoreVertical size={18} />
          </IconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content minW="9rem" p="1" borderWidth="1px" borderColor="#e2e9e6" bg="white" shadow="lg">
              <Menu.Item value="edit" onSelect={() => setDialog("edit")}>
                編集
              </Menu.Item>
              <Menu.Item value="delete" color="red.700" onSelect={() => setDialog("delete")}>
                削除
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>

      <InboxTaskForm
        taskId={taskId}
        defaultTitle={title}
        defaultRemainingHours={remainingMinutes / 60}
        defaultDueDate={dueDate}
        defaultDone={done}
        defaultNotes={notes}
        open={dialog === "edit"}
        onOpenChange={(open) => { if (!open) setDialog(null); }}
      />
      <DeleteTaskDialog
        taskId={taskId}
        title={title}
        open={dialog === "delete"}
        onOpenChange={(open) => { if (!open) setDialog(null); }}
      />
    </>
  );
}
