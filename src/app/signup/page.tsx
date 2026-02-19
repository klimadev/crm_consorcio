import { redirect } from 'next/navigation';

export default function SignupPage() {
  // Redirect to /login where company creation is now integrated
  redirect('/login');
}
