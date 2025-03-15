import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../trpc";
import { UsersService } from "../services/users/users.service";
import { userSchema } from "@app/database";
import {
  createUserSchema,
  updateUserSchema,
} from "../services/users/dto/user.dto";
import { container } from "../__di/container";
import { TYPES } from "../__di/types";

// Get the UsersService from the DI container or use the singleton instance
let userService: UsersService;
try {
  userService = container.get<UsersService>(TYPES.USER_SERVICE);
} catch {
  userService = UsersService.getInstance();
}

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const address = ctx.user?.address || "";
    return userService.findByAddress(address);
  }),

  getById: adminProcedure
    .input(userSchema.shape.id)
    .query(({ input }) => userService.findById(input)),

  getByAddress: adminProcedure
    .input(userSchema.shape.address)
    .query(({ input }) => userService.findByAddress(input)),

  list: adminProcedure.query(() => userService.findAll()),

  create: adminProcedure
    .input(createUserSchema)
    .mutation(({ input }) => userService.create(input)),

  update: adminProcedure
    .input(
      z.object({
        id: userSchema.shape.id,
        data: updateUserSchema,
      })
    )
    .mutation(({ input }) => userService.update(input.id, input.data)),

  delete: adminProcedure
    .input(userSchema.shape.id)
    .mutation(async ({ input }) => {
      await userService.delete(input);

      return { success: true };
    }),
});
