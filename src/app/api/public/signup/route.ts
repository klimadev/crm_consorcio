import { getDb } from '@/lib/db/connection';
import { signupCompany } from '@/lib/domain/onboarding/signup.service';
import { parseJsonBody } from '@/lib/http/parse';
import { fail, ok } from '@/lib/http/response';
import type { SignupInput } from '@/types';

export async function POST(request: Request) {
  try {
    const input = await parseJsonBody<SignupInput>(request);
    const result = await signupCompany(getDb(), input);
    return ok(result, 201);
  } catch (error) {
    return fail(error);
  }
}
