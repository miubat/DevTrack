import type { TransformFnParams } from 'class-transformer';

// For @Transform: spaces around a text field are not checked, because they are not saved.
export const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;
