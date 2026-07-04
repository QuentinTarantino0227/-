const CN_NUMBERS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const CN_UNITS = ['', '拾', '佰', '仟'];

/** 转换 4 位以内的数字 */
function convertFourDigits(numStr: string): string {
  let result = '';
  let hasNonZero = false;
  let lastWasZero = false;

  for (let i = 0; i < numStr.length; i++) {
    const digit = parseInt(numStr[i]);
    const unit = CN_UNITS[numStr.length - 1 - i];

    if (digit === 0) {
      if (hasNonZero && !lastWasZero) {
        result += CN_NUMBERS[0];
        lastWasZero = true;
      }
    } else {
      hasNonZero = true;
      lastWasZero = false;
      result += CN_NUMBERS[digit] + unit;
    }
  }

  return result.replace(/零+$/, '');
}

/** 将阿拉伯数字转换为汉语大写（支持到万亿级） */
export function numberToChinese(num: number): string {
  if (num === 0) return '零';
  if (num < 0) return '负' + numberToChinese(-num);

  const numStr = Math.floor(num).toString();

  // 补零到 4 的倍数
  const padLength = (4 - (numStr.length % 4)) % 4;
  const padded = '0'.repeat(padLength) + numStr;

  const groups: string[] = [];
  for (let i = 0; i < padded.length; i += 4) {
    groups.push(padded.substring(i, i + 4));
  }

  const bigUnits = ['', '万', '亿', '万亿'];
  let result = '';

  for (let i = 0; i < groups.length; i++) {
    const groupValue = parseInt(groups[i]);
    const groupText = convertFourDigits(groups[i]);
    const bigUnit = bigUnits[groups.length - 1 - i];

    if (groupValue === 0) {
      // 全零组：只在需要时补一个零
      if (result && !result.endsWith('零')) {
        result += '零';
      }
    } else {
      // 非零组，如果前面有零则补零
      if (result && groups[i].startsWith('0')) {
        result += '零';
      }
      result += groupText + bigUnit;
    }
  }

  return result.replace(/零+$/, '') || '零';
}
