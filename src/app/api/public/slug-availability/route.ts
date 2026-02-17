import { getDb } from '@/lib/db/connection';
import { companyRepository } from '@/lib/db/repositories/company.repository';
import { AppError } from '@/lib/http/errors';
import { fail, ok } from '@/lib/http/response';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug')?.trim().toLowerCase();
    if (!slug) {
      throw new AppError('VALIDATION_ERROR', 'slug query param is required.', 400);
    }

    const available = companyRepository.isSlugAvailable(getDb(), slug);
    return ok({ slug, available });
  } catch (error) {
    return fail(error);
  }
}
