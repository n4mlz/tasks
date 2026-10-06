"use client";

import * as React from "react";
import {
  Dialog,
  IconButton,
  Portal,
} from "@chakra-ui/react";
import { X } from "lucide-react";

type ModalProps = {
  trigger?: React.ReactElement;
  title: string;
  description?: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function Modal({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
}: ModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => onOpenChange?.(details.open)}
      size={{ mdDown: "sm", md: "md" }}
      scrollBehavior="inside"
      placement="center"
    >
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.500" />
        <Dialog.Positioner p="4">
          <Dialog.Content
            maxH="calc(100dvh - 2rem)"
            overflow="hidden"
            borderRadius="2xl"
            bg="white"
            boxShadow="0 24px 72px rgba(22, 38, 39, 0.2)"
          >
            <Dialog.Header alignItems="flex-start" gap="4" borderBottomWidth="1px" borderColor="#edf0ef">
              <div>
                <Dialog.Title fontSize="lg" lineHeight="short" color="#202a33">
                  {title}
                </Dialog.Title>
                {description ? (
                  <Dialog.Description mt="1" fontSize="sm" color="#68777b">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              <Dialog.CloseTrigger asChild>
                <IconButton aria-label="閉じる" variant="ghost" size="sm" ml="auto">
                  <X size={18} />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body py="5">{children}</Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
