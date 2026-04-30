"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Modal } from "./ui/modal";

type DeleteTaskDialogProps = {
  taskId: string;
  title: string;
};

export function DeleteTaskDialog({ taskId, title }: DeleteTaskDialogProps) {
  return (
    <Modal
      description="削除すると task 本体は一覧から消えます。必要なら後で inbox から作り直してください。"
      title={`「${title}」を削除しますか`}
      trigger={
        <Button type="button" variant="outline">
          削除
        </Button>
      }
    >
      <form action={`/api/tasks/${taskId}/delete`} className="grid gap-4" method="post">
        <p className="text-sm text-slate-600">この操作は確認後すぐに反映されます。</p>
        <div className="flex justify-end">
          <Button type="submit" variant="warning">
            <Trash2 className="h-4 w-4" />
            削除する
          </Button>
        </div>
      </form>
    </Modal>
  );
}
