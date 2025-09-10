export function convertJwtDurationInMs(duration: string): number {
  const timeUnit = duration.at(-1);
  const timeValue = duration.slice(0, -1);
  switch (timeUnit) {
    case 's':
      return parseInt(timeValue) * 1000;
    case 'm':
      return parseInt(timeValue) * 1000 * 60;
    case 'h':
      return parseInt(timeValue) * 1000 * 60 * 60;
    case 'd':
      return parseInt(timeValue) * 1000 * 60 * 60 * 24;
    case 'w':
      return parseInt(timeValue) * 1000 * 60 * 60 * 24 * 7;
    case 'M':
      return parseInt(timeValue) * 1000 * 60 * 60 * 24 * 30;
    default:
      throw new Error('Invalid time unit');
  }
}
