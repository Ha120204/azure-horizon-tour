import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * ===========================================================
 * CUSTOM VALIDATOR: @IsFutureDate()
 * ===========================================================
 * Đảm bảo ngày được truyền vào phải là ngày trong TƯƠNG LAI.
 * Dùng cho trường startDate khi Admin tạo mới Tour.
 *
 * Kỹ thuật Senior: Tự viết Custom Decorator thay vì
 * kiểm tra lòng vòng ở tầng Controller hay Service.
 *
 * Cách dùng:
 *   @IsFutureDate({ message: 'Ngày xuất phát phải sau ngày hiện tại' })
 *   startDate: Date;
 * ===========================================================
 */

@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (!value) return false;
    const inputDate = new Date(value);
    const now = new Date();
    // So sánh theo ngày (bỏ qua giờ phút giây)
    now.setHours(0, 0, 0, 0);
    return inputDate >= now;
  }

  defaultMessage(): string {
    return 'Ngày phải là ngày hôm nay hoặc trong tương lai, không được chọn ngày quá khứ.';
  }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}
