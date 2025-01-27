import { z } from "zod";
import { adminProcedure, protectedProcedure, t } from "../trpc";
import { UsersService } from "../services/users.service";
import { userSchema } from "@app/database";
import { paginationSchema } from "../services/base-services/schema";
import { createUserSchema, updateUserSchema } from "../services/users.service";

const userService = UsersService.getInstance();

export const usersRouter = t.router({
	me: protectedProcedure.query(async ({ ctx }) => {
		const address = ctx.token?.sub?.split(":")[2] || "";
		return userService.findByAddress(address);
	}),

	getById: adminProcedure
		.input(userSchema.shape.id)
		.query(({ input }) => userService.findById(input)),

	getByAddress: adminProcedure
		.input(userSchema.shape.address)
		.query(({ input }) => userService.findByAddress(input)),

	list: adminProcedure
		.input(paginationSchema)
		.query(({ input }) => userService.findAll(input)),

	create: adminProcedure
		.input(createUserSchema)
		.mutation(({ input }) => userService.create(input)),

	update: adminProcedure
		.input(
			z.object({
				id: userSchema.shape.id,
				data: updateUserSchema,
			}),
		)
		.mutation(({ input }) => userService.update(input.id, input.data)),

	delete: adminProcedure
		.input(userSchema.shape.id)
		.mutation(async ({ input }) => {
			await userService.delete(input);

			return { success: true };
		}),
});
