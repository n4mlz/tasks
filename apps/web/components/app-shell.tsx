import type { ReactNode } from "react";
import { Box, Flex, HStack, Link as ChakraLink, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { NavLinks } from "./nav-links";
import { SchedulerStatus } from "./scheduler-status";
import { ServiceWorkerRegistration } from "./service-worker-registration";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Flex minH="100dvh" bg="#f6f7f8">
      <ServiceWorkerRegistration />
      <Box
        as="aside"
        display={{ base: "none", md: "flex" }}
        w="15rem"
        flex="0 0 15rem"
        flexDir="column"
        borderRightWidth="1px"
        borderColor="#e2e7e9"
        bg="white"
        px="5"
        py="6"
      >
        <ChakraLink asChild color="#183b38" _hover={{ textDecoration: "none" }}>
          <NextLink href="/">
            <Text fontSize="lg" fontWeight="700" letterSpacing="-0.03em">
              Task Platform
            </Text>
          </NextLink>
        </ChakraLink>
        <Box mt="8">
          <NavLinks />
        </Box>
        <Box mt="auto" pt="8">
          <SchedulerStatus />
        </Box>
      </Box>

      <Flex minW="0" flex="1" direction="column">
        <Flex
          as="header"
          minH={{ base: "3.5rem", md: "4rem" }}
          align="center"
          justify="space-between"
          gap="3"
          borderBottomWidth={{ base: "1px", md: "0" }}
          borderColor="#e2e7e9"
          bg={{ base: "white", md: "transparent" }}
          px={{ base: "4", md: "8", xl: "12" }}
        >
          <ChakraLink
            asChild
            display={{ base: "inline-flex", md: "none" }}
            color="#183b38"
            _hover={{ textDecoration: "none" }}
          >
            <NextLink href="/">
              <Text fontSize="md" fontWeight="700" letterSpacing="-0.03em">
                Task Platform
              </Text>
            </NextLink>
          </ChakraLink>
          <HStack ml="auto" justify="flex-end">
            <Box display={{ base: "block", md: "none" }}>
              <SchedulerStatus />
            </Box>
          </HStack>
        </Flex>

        <Box
          as="main"
          w="full"
          maxW="76rem"
          minW="0"
          flex="1"
          mx="auto"
          px={{ base: "4", sm: "6", lg: "10", xl: "12" }}
          pt={{ base: "5", md: "8" }}
          pb={{ base: "calc(6rem + env(safe-area-inset-bottom))", md: "10" }}
        >
          {children}
        </Box>

        <Box
          as="div"
          display={{ base: "block", md: "none" }}
          position="fixed"
          insetInline="0"
          bottom="0"
          zIndex="30"
          borderTopWidth="1px"
          borderColor="#e2e7e9"
          bg="rgba(255,255,255,0.97)"
          px="2"
          pt="2"
          pb="max(0.5rem, env(safe-area-inset-bottom))"
          boxShadow="0 -8px 24px rgba(26, 44, 49, 0.06)"
          backdropFilter="blur(12px)"
        >
          <NavLinks orientation="horizontal" />
        </Box>
      </Flex>
    </Flex>
  );
}
