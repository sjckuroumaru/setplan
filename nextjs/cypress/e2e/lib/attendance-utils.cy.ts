import {
  roundToNearest15Minutes,
  roundDownToNearest15Minutes,
  formatTimeToHHmm,
  getCurrentTimeRounded,
  getCurrentTimeRoundedDown,
  getTodayDateString,
} from '../../../src/lib/attendance-utils';

describe('Attendance Utils', () => {
  describe('roundToNearest15Minutes (ceiling)', () => {
    it('should round up minutes to nearest 15 (ceiling)', () => {
      // 13分 → 15分
      const date1 = new Date('2025-11-12T09:13:00');
      const result1 = roundToNearest15Minutes(date1);
      expect(result1.getMinutes()).to.equal(15);

      // 01分 → 15分
      const date2 = new Date('2025-11-12T09:01:00');
      const result2 = roundToNearest15Minutes(date2);
      expect(result2.getMinutes()).to.equal(15);

      // 16分 → 30分
      const date3 = new Date('2025-11-12T09:16:00');
      const result3 = roundToNearest15Minutes(date3);
      expect(result3.getMinutes()).to.equal(30);

      // 31分 → 45分
      const date4 = new Date('2025-11-12T09:31:00');
      const result4 = roundToNearest15Minutes(date4);
      expect(result4.getMinutes()).to.equal(45);

      // 46分 → 00分（次の時間）
      const date5 = new Date('2025-11-12T09:46:00');
      const result5 = roundToNearest15Minutes(date5);
      expect(result5.getMinutes()).to.equal(0);
      expect(result5.getHours()).to.equal(10);
    });

    it('should keep time if already at 15-minute boundary', () => {
      // 00分 → 00分
      const date1 = new Date('2025-11-12T09:00:00');
      const result1 = roundToNearest15Minutes(date1);
      expect(result1.getMinutes()).to.equal(0);

      // 15分 → 15分
      const date2 = new Date('2025-11-12T09:15:00');
      const result2 = roundToNearest15Minutes(date2);
      expect(result2.getMinutes()).to.equal(15);

      // 30分 → 30分
      const date3 = new Date('2025-11-12T09:30:00');
      const result3 = roundToNearest15Minutes(date3);
      expect(result3.getMinutes()).to.equal(30);

      // 45分 → 45分
      const date4 = new Date('2025-11-12T09:45:00');
      const result4 = roundToNearest15Minutes(date4);
      expect(result4.getMinutes()).to.equal(45);
    });

    it('should reset seconds and milliseconds', () => {
      const date = new Date('2025-11-12T09:13:45.999');
      const result = roundToNearest15Minutes(date);
      expect(result.getSeconds()).to.equal(0);
      expect(result.getMilliseconds()).to.equal(0);
    });
  });

  describe('roundDownToNearest15Minutes (floor)', () => {
    it('should round down minutes to nearest 15 (floor)', () => {
      // 13分 → 00分
      const date1 = new Date('2025-11-12T17:13:00');
      const result1 = roundDownToNearest15Minutes(date1);
      expect(result1.getMinutes()).to.equal(0);

      // 01分 → 00分
      const date2 = new Date('2025-11-12T17:01:00');
      const result2 = roundDownToNearest15Minutes(date2);
      expect(result2.getMinutes()).to.equal(0);

      // 16分 → 15分
      const date3 = new Date('2025-11-12T17:16:00');
      const result3 = roundDownToNearest15Minutes(date3);
      expect(result3.getMinutes()).to.equal(15);

      // 31分 → 30分
      const date4 = new Date('2025-11-12T17:31:00');
      const result4 = roundDownToNearest15Minutes(date4);
      expect(result4.getMinutes()).to.equal(30);

      // 46分 → 45分
      const date5 = new Date('2025-11-12T17:46:00');
      const result5 = roundDownToNearest15Minutes(date5);
      expect(result5.getMinutes()).to.equal(45);

      // 40分 → 30分
      const date6 = new Date('2025-11-12T17:40:00');
      const result6 = roundDownToNearest15Minutes(date6);
      expect(result6.getMinutes()).to.equal(30);
    });

    it('should keep time if already at 15-minute boundary', () => {
      // 00分 → 00分
      const date1 = new Date('2025-11-12T17:00:00');
      const result1 = roundDownToNearest15Minutes(date1);
      expect(result1.getMinutes()).to.equal(0);

      // 15分 → 15分
      const date2 = new Date('2025-11-12T17:15:00');
      const result2 = roundDownToNearest15Minutes(date2);
      expect(result2.getMinutes()).to.equal(15);

      // 30分 → 30分
      const date3 = new Date('2025-11-12T17:30:00');
      const result3 = roundDownToNearest15Minutes(date3);
      expect(result3.getMinutes()).to.equal(30);

      // 45分 → 45分
      const date4 = new Date('2025-11-12T17:45:00');
      const result4 = roundDownToNearest15Minutes(date4);
      expect(result4.getMinutes()).to.equal(45);
    });

    it('should reset seconds and milliseconds', () => {
      const date = new Date('2025-11-12T17:40:45.999');
      const result = roundDownToNearest15Minutes(date);
      expect(result.getSeconds()).to.equal(0);
      expect(result.getMilliseconds()).to.equal(0);
    });
  });

  describe('formatTimeToHHmm', () => {
    it('should format time to HH:mm', () => {
      const date1 = new Date('2025-11-12T09:15:00');
      expect(formatTimeToHHmm(date1)).to.equal('09:15');

      const date2 = new Date('2025-11-12T17:30:00');
      expect(formatTimeToHHmm(date2)).to.equal('17:30');

      const date3 = new Date('2025-11-12T00:00:00');
      expect(formatTimeToHHmm(date3)).to.equal('00:00');

      const date4 = new Date('2025-11-12T23:45:00');
      expect(formatTimeToHHmm(date4)).to.equal('23:45');
    });

    it('should pad single digit hours and minutes with zero', () => {
      const date1 = new Date('2025-11-12T01:05:00');
      expect(formatTimeToHHmm(date1)).to.equal('01:05');

      const date2 = new Date('2025-11-12T09:00:00');
      expect(formatTimeToHHmm(date2)).to.equal('09:00');
    });
  });

  describe('getCurrentTimeRounded (for check-in)', () => {
    it('should return current time rounded to nearest 15 minutes (ceiling) in HH:mm format', () => {
      const result = getCurrentTimeRounded();

      // HH:mm形式であることを確認
      expect(result).to.match(/^\d{2}:\d{2}$/);

      // 15分単位であることを確認
      const [, minutes] = result.split(':');
      const minutesNum = parseInt(minutes, 10);
      expect([0, 15, 30, 45]).to.include(minutesNum);
    });
  });

  describe('getCurrentTimeRoundedDown (for check-out)', () => {
    it('should return current time rounded down to nearest 15 minutes (floor) in HH:mm format', () => {
      const result = getCurrentTimeRoundedDown();

      // HH:mm形式であることを確認
      expect(result).to.match(/^\d{2}:\d{2}$/);

      // 15分単位であることを確認
      const [, minutes] = result.split(':');
      const minutesNum = parseInt(minutes, 10);
      expect([0, 15, 30, 45]).to.include(minutesNum);
    });
  });

  describe('getTodayDateString', () => {
    it('should return today date in YYYY-MM-DD format', () => {
      const result = getTodayDateString();

      // YYYY-MM-DD形式であることを確認
      expect(result).to.match(/^\d{4}-\d{2}-\d{2}$/);

      // 実際の日付と一致することを確認
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const expectedDate = `${year}-${month}-${day}`;

      expect(result).to.equal(expectedDate);
    });
  });

  describe('Rounding difference verification', () => {
    it('should demonstrate difference between ceiling and floor rounding', () => {
      // 17:40の場合
      const time1 = new Date('2025-11-12T17:40:00');
      const ceiling1 = roundToNearest15Minutes(time1);
      const floor1 = roundDownToNearest15Minutes(time1);

      expect(ceiling1.getMinutes()).to.equal(45); // 切り上げ
      expect(floor1.getMinutes()).to.equal(30);   // 切り下げ

      // 17:31の場合
      const time2 = new Date('2025-11-12T17:31:00');
      const ceiling2 = roundToNearest15Minutes(time2);
      const floor2 = roundDownToNearest15Minutes(time2);

      expect(ceiling2.getMinutes()).to.equal(45); // 切り上げ
      expect(floor2.getMinutes()).to.equal(30);   // 切り下げ

      // 17:46の場合
      const time3 = new Date('2025-11-12T17:46:00');
      const ceiling3 = roundToNearest15Minutes(time3);
      const floor3 = roundDownToNearest15Minutes(time3);

      expect(ceiling3.getMinutes()).to.equal(0);  // 切り上げ（18:00）
      expect(ceiling3.getHours()).to.equal(18);
      expect(floor3.getMinutes()).to.equal(45);   // 切り下げ（17:45）
      expect(floor3.getHours()).to.equal(17);

      // 17:30の場合（境界値）
      const time4 = new Date('2025-11-12T17:30:00');
      const ceiling4 = roundToNearest15Minutes(time4);
      const floor4 = roundDownToNearest15Minutes(time4);

      expect(ceiling4.getMinutes()).to.equal(30); // そのまま
      expect(floor4.getMinutes()).to.equal(30);   // そのまま
    });

    it('should verify check-in uses ceiling and check-out uses floor', () => {
      // モック時刻を使用してテスト
      // 9:01 の場合
      cy.clock(new Date('2025-11-12T09:01:00').getTime());
      const checkInTime = getCurrentTimeRounded();
      expect(checkInTime).to.equal('09:15'); // 切り上げ
      cy.clock().invoke('restore');

      // 17:40 の場合
      cy.clock(new Date('2025-11-12T17:40:00').getTime());
      const checkOutTime = getCurrentTimeRoundedDown();
      expect(checkOutTime).to.equal('17:30'); // 切り下げ
      cy.clock().invoke('restore');
    });
  });
});
