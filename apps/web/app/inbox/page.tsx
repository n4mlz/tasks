import React from "react";
import { Box, Button, Flex, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { InboxTaskActions } from "../../components/inbox-task-actions";
import { TaskIntakeFlow } from "../../components/task-intake-flow";
import { taskPlatform } from "../../lib/task-platform";
import { formatHoursFromMinutes, formatJapaneseDate } from "../../lib/presentation";

export const dynamic = "force-dynamic";

type InboxPageProps = {
  searchParams?: Promise<{ showCompleted?: string }>;
};

async function InboxPage(): Promise<React.ReactElement>;
async function InboxPage(props: InboxPageProps): Promise<React.ReactElement>;
async function InboxPage(props: InboxPageProps = {}) {
  const searchParams = (await props.searchParams) ?? {};
  const showCompleted = searchParams.showCompleted === "1";
  const allTasks = (await taskPlatform.listTasks()) as Array<{
    id: string;
    title: string;
    remainingMinutes: number;
    status: string;
    dueDate: string | null;
    notes?: string;
    updatedAt?: string;
  }>;
  const tasks = showCompleted
    ? allTasks.filter((task) => task.status === "done").sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    : allTasks.filter((task) => task.status !== "done" && task.status !== "archived");

  return (
    <Stack gap={{ base: "6", md: "8" }}>
      <Flex align="center" justify="space-between" gap="4" wrap="wrap">
        <Heading size="2xl" letterSpacing="-0.04em" color="#1e302e">Inbox</Heading>
        <Button asChild variant="outline" size="sm" borderColor="#d5dfdc">
          <NextLink href={showCompleted ? "/inbox" : "/inbox?showCompleted=1"}>
            {showCompleted ? "未完了タスク" : `完了タスクを見る（${allTasks.filter((task) => task.status === "done").length}）`}
          </NextLink>
        </Button>
      </Flex>

      {!showCompleted ? (
        <Box borderWidth="1px" borderColor="#e2e9e6" borderRadius="2xl" bg="white" p={{ base: "4", sm: "6" }}>
          <Stack gap="4">
            <Box>
              <Heading size="md" color="#263a37">タスクを追加</Heading>
              <Text mt="1" fontSize="sm" color="#71807e">まずは名前と必要な時間だけ入力できます。</Text>
            </Box>
            <TaskIntakeFlow />
          </Stack>
        </Box>
      ) : null}

      <Stack gap="3">
        <Flex align="baseline" justify="space-between" gap="3">
          <Heading size="md" color="#263a37">{showCompleted ? "完了タスク" : "未完了タスク"}</Heading>
          <Text fontSize="sm" color="#71807e">{tasks.length} 件</Text>
        </Flex>
        {tasks.length === 0 ? (
          <Box borderWidth="1px" borderStyle="dashed" borderColor="#d5dfdc" borderRadius="xl" bg="white" p="5">
            <Text fontSize="sm" color="#71807e">{showCompleted ? "完了したタスクはありません。" : "未完了のタスクはありません。"}</Text>
          </Box>
        ) : (
          <Stack gap="2">
            {tasks.map((task) => (
              <Flex
                as="article"
                key={task.id}
                align="center"
                justify="space-between"
                gap="4"
                borderWidth="1px"
                borderColor="#e3e9e7"
                borderRadius="xl"
                bg="white"
                px={{ base: "4", sm: "5" }}
                py="4"
                wrap="wrap"
              >
                <Stack minW="0" flex="1" gap="1">
                  <Text fontWeight="600" color="#243633" overflowWrap="anywhere">{task.title}</Text>
                  <HStack gap="3" flexWrap="wrap" fontSize="sm" color="#667673">
                    <Text>残り {formatHoursFromMinutes(task.remainingMinutes)}</Text>
                    {task.dueDate ? <Text>期限 {formatJapaneseDate(task.dueDate)}</Text> : null}
                    {task.status === "done" ? <Text color="#27645d">完了</Text> : null}
                  </HStack>
                </Stack>
                <InboxTaskActions
                  taskId={task.id}
                  title={task.title}
                  remainingMinutes={task.remainingMinutes}
                  dueDate={task.dueDate}
                  done={task.status === "done"}
                  notes={task.notes ?? ""}
                />
              </Flex>
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}

export default InboxPage;
