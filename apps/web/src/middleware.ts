import createMiddleware from "next-intl/middleware";

export default createMiddleware({
	locales: ['en', 'ru'],
	defaultLocale: 'en'
});

export const config = {
	// Match only internationalized pathnames
	matcher: ['/((?!api|_next|.*\\..*).*)']
};
