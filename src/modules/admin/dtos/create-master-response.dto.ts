export class CreateMasterResponseDto {
  constructor(data: CreateMasterResponseDto) {
    if (data) Object.assign(this, data);
  }

  userId: string;
  email?: string;
  nickname?: string;
  balance?: string | number;
  role: string;
  password: string;
  maxExposurePerVip: number | null;
  maxNumberOfUsers: number | null;
  predefinedBookieStake?: number;
  flexibleBookieStake?: number;

  static from(data: CreateMasterResponseDto): CreateMasterResponseDto {
    return new CreateMasterResponseDto({
      userId: data.userId,
      email: data.email,
      nickname: data.nickname,
      balance: data.balance,
      role: data.role,
      password: data.password,
      maxExposurePerVip: data.maxExposurePerVip,
      maxNumberOfUsers: data.maxNumberOfUsers,
      flexibleBookieStake: data.flexibleBookieStake,
      predefinedBookieStake: data.predefinedBookieStake,
    });
  }
}
