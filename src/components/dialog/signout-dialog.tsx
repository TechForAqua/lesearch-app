"use client";

import { useUserStore } from "@/store/userStore";
import type{  SignOut } from "@supabase/supabase-js";
import type{ PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";

export default function SignOutDialog({
  children,
  scope = "local",
}: PropsWithChildren & SignOut) {
  const { signOutAsync } = useUserStore();
  const title = {
    local: "Are you sure, do you want to log out?",
    global: "Are you sure, do you want to log out from all logged device?",
    others: "Are you sure, do you want to log out from other logged device?",
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        className="w-[90%] gap-0 rounded-xl p-0 md:max-w-sm"
      >
        <VisuallyHidden.Root asChild>
          <DialogTitle>Sign Out</DialogTitle>
        </VisuallyHidden.Root>
        <DialogHeader className="p-4">
          <DialogDescription className="leading-1 text-left text-primary">
            {title[scope]}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="w-full flex-row gap-0 border-t">
          <Button
            type="button"
            size="lg"
            variant="ghost"
            className="flex-1 rounded-none rounded-bl-xl text-destructive hover:text-destructive"
            onClick={() => signOutAsync(scope)}
          >
            Yes
          </Button>
          <div className="!m-0 box-border h-full w-[1px] border-r p-0" />
          <DialogClose asChild className="!m-0">
            <Button
              type="button"
              size="lg"
              className="flex-1 rounded-none rounded-br-xl "
              variant="ghost"
            >
              No
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
