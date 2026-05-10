import { BadRequestException } from '@nestjs/common';

export type PaginationInput = {
    page?: number;
    page_size?: number;
};

export type PaginationResult = {
    page: number;
    page_size: number;
    offset: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 200;

export function resolvePagination(input: PaginationInput): PaginationResult {
    const page = input.page ?? DEFAULT_PAGE;
    const pageSize = input.page_size ?? DEFAULT_PAGE_SIZE;

    if (!Number.isInteger(page) || page <= 0) {
        throw new BadRequestException({
            code: 'PAGINATION_PAGE_INVALID',
            message: 'page must be a positive integer',
            details: { page },
        });
    }

    if (!Number.isInteger(pageSize) || pageSize <= 0 || pageSize > MAX_PAGE_SIZE) {
        throw new BadRequestException({
            code: 'PAGINATION_PAGE_SIZE_INVALID',
            message: `page_size must be between 1 and ${MAX_PAGE_SIZE}`,
            details: { page_size: pageSize },
        });
    }

    return {
        page,
        page_size: pageSize,
        offset: (page - 1) * pageSize,
    };
}

export function buildPaginationMeta(
    page: number,
    pageSize: number,
    totalItems: number,
) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    return {
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages,
    };
}
