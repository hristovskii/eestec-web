'use client';

import { LogOut, PenLine, Shield, User } from 'lucide-react';
import { toast } from 'sonner';

import { Notice } from '@/shared/ui/notice';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/primitives/accordion';
import { Button } from '@/shared/ui/primitives/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/primitives/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/primitives/sheet';

import { DsLabel, DsSection } from './ds-section';

export function OverlaysSection() {
  return (
    <DsSection
      id="overlays"
      title="Feedback & overlays"
      intro="Dialogs, sheets and menus are Radix primitives (focus trap, Esc, keyboard). Toasts: bottom-right, 5 s; errors stay until closed."
      frames="07-MyProfileStates, 14-AdminDialogs, 14-AdminEditStates, 11-JoinPage (FAQ), 06-EventDetail-Ended"
    >
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Stop sharing your CV?</DialogTitle>
              <DialogDescription>
                Partners lose access right away and we delete your CV file. You can upload it again any time.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="quiet">Keep sharing</Button>
              </DialogClose>
              <Button variant="primary">Stop sharing and delete CV</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary">Open filter sheet</Button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <p className="px-5 pb-5 text-small text-muted-ink">Event type and year chips go here (M6).</p>
            <SheetFooter>
              <Button variant="quiet" block>
                Clear
              </Button>
              <Button block>Show 14 events</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">Account menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-68">
            <DropdownMenuItem>
              <User aria-hidden />
              My profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <PenLine aria-hidden />
              Create a Memory
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Shield aria-hidden />
              Admin panel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut aria-hidden />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="quiet"
          onClick={() =>
            toast.success('Saved as draft', { action: { label: 'Undo', onClick: () => undefined } })
          }
        >
          Toast
        </Button>
        <Button
          variant="quiet"
          onClick={() =>
            toast.error('Couldn’t save', {
              description: 'Check your connection. Your changes are kept on this device.',
              duration: Infinity,
              closeButton: true,
            })
          }
        >
          Error toast
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <DsLabel>Notices</DsLabel>
          <Notice title="This event ended on 13 Nov 2026">
            Thanks to all 24 participants. Photos and the aftermovie will appear here once the organizers
            upload them.
          </Notice>
          <Notice tone="urgent" title="Not approved yet: the board asked for changes">
            “Please add a short description to the 2 gallery photos without alt text and send it again.”
          </Notice>
          <Notice tone="dark" icon={false}>
            Preview. Only you can see this. It goes live after the board approves it.
          </Notice>
        </div>
        <div className="flex flex-col gap-3">
          <DsLabel>Accordion (FAQ)</DsLabel>
          <Accordion type="single" collapsible defaultValue="q2">
            <AccordionItem value="q1">
              <AccordionTrigger>Do I have to study at FEEIT?</AccordionTrigger>
              <AccordionContent>No. Students of other faculties are welcome too.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>How much time does it take?</AccordionTrigger>
              <AccordionContent>
                A weekly meeting plus whatever your team needs before an event.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Does it cost anything?</AccordionTrigger>
              <AccordionContent>The membership fee is set by the board each year.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </DsSection>
  );
}
