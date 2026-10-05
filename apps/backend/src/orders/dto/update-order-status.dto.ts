import { IsIn } from 'class-validator';

const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'collected', 'no_show', 'cancelled'] as const;

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status!: (typeof ORDER_STATUSES)[number];
}
