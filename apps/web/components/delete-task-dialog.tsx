"use client";

import { Button, Flex, Stack, Text } from "@chakra-ui/react";
import { Trash2 } from "lucide-react";
import { Modal } from "./ui/modal";

type DeleteTaskDialogProps = {
  taskId: string;
  title: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DeleteTaskDialog({ taskId, title, open, onOpenChange }: DeleteTaskDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="タスクを削除しますか？"
      description={title}
      trigger={open === undefined ? <Button size="sm" variant="ghost" colorPalette="red">削除</Button> : undefined}
    >
      <form action={`/api/tasks/${taskId}/delete`} method="post">
        <Stack gap="5">
          <Text color="#657572" fontSize="sm">削除したタスクは一覧から戻せません。</Text>
          <Flex justify="flex-end">
            <Button type="submit" colorPalette="red">
              <Trash2 size={16} />
              タスクを削除
            </Button>
          </Flex>
        </Stack>
      </form>
    </Modal>
  );
}
