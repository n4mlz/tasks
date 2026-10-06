"use client";

import { Flex, Link as ChakraLink, Text } from "@chakra-ui/react";
import { BarChart3, CalendarDays, House, Inbox } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "今日", Icon: House },
  { href: "/inbox", label: "Inbox", Icon: Inbox },
  { href: "/week", label: "計画", Icon: CalendarDays },
  { href: "/dashboard", label: "振り返り", Icon: BarChart3 },
];

export function NavLinks({
  orientation = "vertical",
}: {
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const horizontal = orientation === "horizontal";

  return (
    <Flex
      as="nav"
      direction={horizontal ? "row" : "column"}
      gap={horizontal ? "1" : "1.5"}
      aria-label="メインナビゲーション"
    >
      {navigationItems.map(({ href, label, Icon }) => {
        const active = pathname === href || (href === "/dashboard" && pathname === "/logs");
        return (
          <ChakraLink
            key={href}
            asChild
            display="flex"
            flex={horizontal ? "1" : undefined}
            minW="0"
            minH="12"
            alignItems="center"
            justifyContent={horizontal ? "center" : "flex-start"}
            gap={horizontal ? "1" : "3"}
            flexDir={horizontal ? "column" : "row"}
            borderRadius="lg"
            px={horizontal ? "1" : "3"}
            py={horizontal ? "1.5" : "3"}
            color={active ? "#245c55" : "#68777b"}
            bg={active ? "#eaf2f0" : "transparent"}
            fontWeight={active ? "600" : "500"}
            _hover={{ bg: active ? "#eaf2f0" : "#f2f5f4", textDecoration: "none" }}
            _focusVisible={{ outline: "3px solid #286b65", outlineOffset: "2px" }}
          >
            <NextLink href={href} aria-current={active ? "page" : undefined}>
              <Icon size={horizontal ? 19 : 18} strokeWidth={active ? 2.3 : 1.8} />
              <Text as="span" fontSize={horizontal ? "xs" : "sm"} lineHeight="short">
                {label}
              </Text>
            </NextLink>
          </ChakraLink>
        );
      })}
    </Flex>
  );
}
