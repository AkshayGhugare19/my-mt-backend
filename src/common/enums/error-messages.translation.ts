import { ValidationErrorMessage, ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { ErrorMessages } from './error-messages.enum';

export const ErrorMessageCodeToI18n: {
  // eslint-disable-next-line no-unused-vars
  [k in keyof typeof ErrorMessages | ValidationErrorMessage | string]: string;
} = {
  [ErrorMessages.SOMETHING_WENT_WRONG]: 'errors.something_went_wrong',
  [ErrorMessages.BAD_REQUEST]: 'errors.bad_request',
  [ErrorMessages.UNAUTHORIZED_ACTION]: 'errors.unauthorized',
  [ErrorMessages.UNKNOWN_ERROR]: 'errors.unknown_error',
  Unauthorized: 'errors.unauthorized',

  [ErrorMessages.DUPLICATE_RESOURCE]: 'errors.duplicate_resource',
  [ErrorMessages.FAILED_TO_CREATE]: 'errors.failed_to_create',
  [ErrorMessages.FAILED_TO_UPDATE]: 'errors.failed_to_update',
  [ErrorMessages.NOT_FOUND]: 'errors.not_found',
  [ErrorMessages.VALIDATION_FAILED]: 'errors.validation_failed',

  // User
  [ErrorMessages.USER_NOT_FOUND]: 'errors.user_not_found',
  [ErrorMessages.WALLET_ALREADY_IN_USE]: 'errors.wallet_already_in_use',
  [ErrorMessages.DIFFERENT_WALLET_REGISTERED_TO_ACCOUNT]: 'errors.different_wallet_registered_to_account',
  [ErrorMessages.EMAIL_OR_NICKNAME_REQUIRED]: 'errors.email_or_nickname_required',
  [ErrorMessages.NO_MASTER_FOUND]: 'errors.no_master_found',
  [ErrorMessages.INVALID_VERIFICATION_CODE]: 'errors.invalid_verification_code',
  [ErrorMessages.INVALID_TWO_FACTOR_AUTHENTICATION_CODE]: 'INVALID_TWO_FACTOR_AUTHENTICATION_CODE',
  [ErrorMessages.TWO_FACTOR_AUTHENTICATION_NEEDS_EMAIL]: 'errors.two_factor_authentication_needs_email',
  [ErrorMessages.TWO_FACTOR_AUTHENTICATION_REQUIRED]: 'TWO_FACTOR_AUTHENTICATION_REQUIRED',
  [ErrorMessages.TWO_FACTOR_AUTHENTICATION_CODE_EXPIRED]: 'TWO_FACTOR_AUTHENTICATION_CODE_EXPIRED',
  [ErrorMessages.USER_BLOCKED]: 'errors.user_blocked',
  'Token expired': 'Token expired',

  // Master
  [ErrorMessages.MASTER_REACHED_MAX_USER_COUNT]: 'errors.master_reached_max_user_count',
  [ErrorMessages.MASTER_REACHED_MAX_USER_EXPOSURE]: 'errors.master_reached_max_user_exposure',
  [ErrorMessages.MASTER_REACHED_MAX_EXPOSURE]: 'errors.master_reached_max_exposure',
  [ErrorMessages.INVALID_BOOKIE_STAKE]: 'errors.invalid_bookie_stake',

  // Register
  [ErrorMessages.EMAIL_ALREADY_IN_USE]: 'errors.email_already_in_use',
  [ErrorMessages.NICKNAME_ALREADY_IN_USE]: 'errors.nickname_already_in_use',
  [ErrorMessages.PHONE_ALREADY_IN_USE]: 'errors.phone_already_in_use',
  [ErrorMessages.EMAIL_NOT_VERIFIED]: 'errors.email_not_verified',
  [ErrorMessages.FAILED_TO_GENERATE_PLAYER_TAG]: 'errors.failed_to_generate_player_tag',

  [ErrorMessages.DEPENDENCY_REQUEST_FAILED]: 'errors.dependency_request_failed',
  [ErrorMessages.INVALID_OR_EXPIRED_CODE]: 'errors.invalid_or_expired_code',

  // Login
  [ErrorMessages.BAD_CREDENTIALS]: 'errors.bad_credentials',
  [ErrorMessages.INVALID_LOGIN_NONCE]: 'errors.invalid_login_nonce',
  [ErrorMessages.INVALID_LOGIN_SIGNATURE]: 'errors.invalid_login_signature',
  [ErrorMessages.USER_NOT_ACTIVE]: 'errors.user_not_active',

  // Balance
  [ErrorMessages.USER_BALANCE_NOT_FOUND]: 'errors.user_balance_not_found',
  [ErrorMessages.INSUFFICIENT_BALANCE]: 'errors.insufficient_balance',
  [ErrorMessages.WITHDRAWALS_REQUIRE_MINIMUM_VOLUME_PLAYED]: 'errors.withdrawals_require_minimum_volume_played',
  [ErrorMessages.WITHDRAWALS_STOPPED_FOR_THIS_ACCOUNT]: 'errors.withdrawals_stopped_for_this_account',

  // Bet
  [ErrorMessages.BET_NOT_FOUND]: 'errors.bet_not_found',
  [ErrorMessages.BET_USER_ID_MISMATCH]: 'errors.bet_user_id_mismatch',
  [ErrorMessages.MASTER_CANNOT_PLACE_BET]: 'errors.master_cannot_place_bet',
  [ErrorMessages.INVALID_REQUEST_BODY_SPORTS_EXCHANGE]: 'errors.invalid_request_body_sports_exchange',
  [ErrorMessages.BET_ALREADY_SETTLED]: 'errors.bet_already_settled',
  [ErrorMessages.BET_OVER_MAX_SIZE]: 'errors.bet_over_max_size',
  [ErrorMessages.BET_NOT_SETTLED]: 'errors.bet_not_settled',
  [ErrorMessages.BET_PLACING_IN_PROGRESS]: 'errors.bet_placing_in_progress',

  [ErrorMessages.INVALID_EXTRA_DATA]: 'errors.invalid_extra_data',
  [ErrorMessages.ERROR_WHILE_ACQUIRING_LOCK]: 'errors.error_while_acquiring_lock',

  // Token Issue
  [ErrorMessages.TOKEN_ISSUE_NOT_FOUND]: 'errors.token_issue_not_found',
  [ErrorMessages.TOKEN_ISSUE_ALREADY_RESOLVED]: 'errors.token_issue_already_resolved',
  [ErrorMessages.TOKEN_REQUEST_IN_PROGRESS]: 'errors.token_request_in_progress',
  [ErrorMessages.TOKEN_ISSUE_IN_PROGRESS]: 'errors.token_issue_in_progress',
  [ErrorMessages.MASTER_DID_NOT_APPROVE_REQUEST]: 'errors.master_did_not_approve_request',
  [ErrorMessages.INVALID_PREPAID_STATUS]: 'errors.invalid_prepaid_status',

  // Token Settlement
  [ErrorMessages.TOKEN_SETTLEMENT_NOT_FOUND]: 'errors.token_settlement_not_found',
  [ErrorMessages.TOKEN_SETTLEMENT_AMOUNT_NOT_PROVIDED]: 'errors.token_settlement_amount_not_provided',
  [ErrorMessages.TOKEN_SETTLEMENT_ALREADY_RESOLVED]: 'errors.token_settlement_already_resolved',
  [ErrorMessages.TOKEN_SETTLEMENT_PROOF_ALREADY_UPLOADED]: 'errors.token_settlement_proof_already_uploaded',
  [ErrorMessages.TOKEN_SETTLEMENT_NOT_APPROVED]: 'errors.token_settlement_not_approved',
  [ErrorMessages.TOKEN_SETTLEMENT_IN_PROGRESS]: 'errors.token_settlement_in_progress',
  [ErrorMessages.TOKEN_SETTLEMENT_ALREADY_ACCEPTED_BY_USER]: 'errors.token_settlement_already_accepted_by_user',
  [ErrorMessages.TOKEN_SETTLEMENT_ALREADY_CLOSED]: 'errors.token_settlement_already_closed',

  // Withdrawal
  [ErrorMessages.WITHDRAWAL_REQUEST_NOT_FOUND]: 'errors.withdrawal_request_not_found',
  [ErrorMessages.WITHDRAWAL_REQUEST_ALREADY_PROCESSED]: 'errors.withdrawal_request_already_processed',
  [ErrorMessages.WITHDRAWAL_REQUEST_NOT_ACCEPTED]: 'errors.withdrawal_request_not_accepted',
  [ErrorMessages.MULTIPLE_WITHDRAWALS_PENDING]: 'errors.multiple_withdrawals_pending',
  [ErrorMessages.WALLET_NOT_FOUND]: 'errors.wallet_not_found',
  [ErrorMessages.INVALID_TRANSACTION_HASH]: 'errors.invalid_transaction_hash',
  [ErrorMessages.INVALID_WALLET_ADDRESS]: 'errors.invalid_wallet_address',
  [ErrorMessages.INVALID_CHAIN]: 'errors.invalid_chain',
  [ErrorMessages.INVALID_CURRENCY]: 'errors.invalid_currency',
  [ErrorMessages.INVALID_AMOUNT]: 'errors.invalid_amount',

  // Mailing
  [ErrorMessages.MAILING_DOMAIN_NOT_SET]: 'errors.mailing_domain_not_set',

  // Roles
  [ErrorMessages.ROLE_NOT_FOUND]: 'errors.role_not_found',

  // Permissions
  [ErrorMessages.INVALID_PERMISSIONS_PROVIDED]: 'errors.invalid_permissions_provided',
  [ErrorMessages.CANNOT_EDIT_SUPER_MASTER_PERMISSIONS]: 'errors.cannot_edit_super_master_permissions',

  // Bonus
  [ErrorMessages.TRIGGER_CONFIG_IS_REQUIRED]: 'errors.trigger_config_is_required',
  [ErrorMessages.DEPOSIT_TRIGGER_AND_TARGET_ARE_INCOMPATIBLE]: 'errors.deposit_trigger_and_target_are_incompatible',
  [ErrorMessages.INCOMPATIBLE_TRIGGER_TYPE_AND_TRIGGER_CONFIG]: 'errors.incompatible_trigger_type_and_trigger_config',
  [ErrorMessages.INVALID_PRODUCER_TRIGGER]: 'errors.invalid_producer_trigger',
  [ErrorMessages.INVALID_PROGRESS_TRIGGER]: 'errors.invalid_progress_trigger',
  [ErrorMessages.INVALID_CONSUMER_TRIGGER]: 'errors.invalid_consumer_trigger',
  [ErrorMessages.INVALID_ROLLOVER_AMOUNT]: 'errors.invalid_rollover_amount',
  [ErrorMessages.INVALID_ROLLOVER_EXPIRY_TIME]: 'errors.invalid_rollover_expiry_time',

  // Coupon codes
  [ErrorMessages.COUPON_CODE_ALREADY_EXISTS]: 'errors.coupon_code_already_exists',
  [ErrorMessages.COUPON_CODE_NOT_FOUND]: 'errors.coupon_code_not_found',
  [ErrorMessages.COUPON_CODE_REDEEMED_BY_USERS]: 'errors.coupon_code_redeemed_by_users',
  [ErrorMessages.COUPON_CODE_OUT_OF_STOCK]: 'errors.coupon_code_out_of_stock',
  [ErrorMessages.COUPON_CODE_EXPIRED]: 'errors.coupon_code_expired',
  [ErrorMessages.COUPON_CODE_DISABLED]: 'errors.coupon_code_disabled',
  [ErrorMessages.COUPON_CODE_ALREADY_REDEEMED]: 'errors.coupon_code_already_redeemed',
  [ErrorMessages.COUPON_CODE_GROUP_ALREADY_REDEEMED]: 'errors.coupon_code_group_already_redeemed',
  [ErrorMessages.BONUS_DISABLED_FOR_USER]: 'errors.bonus_disabled_for_user',
  [ErrorMessages.INVALID_TIP_TARGET]: 'errors.invalid_tip_target',
  [ErrorMessages.TIP_IN_PROGRESS]: 'errors.tip_in_progress',

  // VALIDATION
  [ValidationErrorMessages.INPUT_MUST_BE_A_VALID_ID]: 'errors.input_must_be_a_valid_id',
  [ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER]: 'errors.input_must_be_a_number',
  [ValidationErrorMessages.INPUT_MUST_BE_A_STRING]: 'errors.input_must_be_a_string',
  [ValidationErrorMessages.INPUT_IS_REQUIRED]: 'errors.input_is_required',

  // Reports
  [ErrorMessages.CANNOT_EXPORT_EMPTY_DATA]: 'errors.cannot_export_empty_data',
} as const;
