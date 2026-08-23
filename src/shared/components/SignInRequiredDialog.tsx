import { LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

type SignInRequiredDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnPath?: string;
  title?: string;
  description?: string;
};

export function SignInRequiredDialog({
  open,
  onOpenChange,
  returnPath = '/',
  title = 'Sign in required',
  description = 'You need to sign in before continuing. Create a free account or sign in to purchase products and access your dashboard.',
}: SignInRequiredDialogProps) {
  const authState = { from: { pathname: returnPath } };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d5ffe9]">
              <LogIn className="h-5 w-5 text-[#0b3a3f]" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" asChild>
            <Link to="/signup" onClick={() => onOpenChange(false)}>
              Create account
            </Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] hover:brightness-95"
          >
            <Link to="/signin" state={authState} onClick={() => onOpenChange(false)}>
              Sign in
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
