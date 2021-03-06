import {
  endOfRange,
  appointmentSegments,
  appointmentLevels,
  inRange,
  segmentsOverlap,
  sortAppointments,
} from './appointment-levels';

describe('endOfRange', () => {
  test('it adds one day by default', () => {
    const dateRange = [new Date(2017, 0, 1), new Date(2017, 0, 2)];

    const result = endOfRange(dateRange);

    expect(result.first).toEqual(dateRange[0]);
    expect(result.last).toEqual(new Date(2017, 0, 3));
  });

  test('it respects unit value when passed', () => {
    const dateRange = [new Date(2017, 0, 1), new Date(2017, 0, 2)];

    const result = endOfRange(dateRange, 'week');

    expect(result.first).toEqual(dateRange[0]);
    expect(result.last).toEqual(new Date(2017, 0, 9));
  });
});

describe('appointmentSegments', () => {
  const appointment = { start: new Date(2017, 0, 8), end: new Date(2017, 0, 11, 12) };

  test('it includes the original appointment in the returned object', () => {
    const range = [
      new Date(2017, 0, 8),
      new Date(2017, 0, 9),
      new Date(2017, 0, 10),
      new Date(2017, 0, 11),
    ];

    const result = appointmentSegments(appointment, range);

    expect(result.appointment).toEqual(appointment);
  });

  describe('when the appointment spans the full range', () => {
    const range = [
      new Date(2017, 0, 8),
      new Date(2017, 0, 9),
      new Date(2017, 0, 10),
      new Date(2017, 0, 11),
    ];

    test('it sets span equal to the number of days the appointment spans', () => {
      const result = appointmentSegments(appointment, range);

      expect(result.span).toBe(4);
    });

    test('it sets left equal to one', () => {
      const result = appointmentSegments(appointment, range);

      expect(result.left).toBe(1);
    });

    test('it sets right equal to the length of the range', () => {
      const result = appointmentSegments(appointment, range);

      expect(result.right).toBe(4);
    });
  });

  describe('when the appointment starts before the range and ends at the end of the range', () => {
    const range = [new Date(2017, 0, 9), new Date(2017, 0, 10), new Date(2017, 0, 11)];

    test('it sets span equal to the number of days the range spans', () => {
      const result = appointmentSegments(appointment, range);

      expect(result.span).toBe(3);
    });

    test('it sets left equal to one', () => {
      const result = appointmentSegments(appointment, range);

      expect(result.left).toBe(1);
    });

    test('it sets right equal to the length of the range', () => {
      const result = appointmentSegments(appointment, range);

      expect(result.right).toBe(3);
    });
  });

  describe('when the appointment starts at the start of the range and ends after it', () => {
    const range = [new Date(2017, 0, 8), new Date(2017, 0, 9), new Date(2017, 0, 10)];

    test('it sets span equal to the number of days the range spans', () => {
      const result = appointmentSegments(appointment, range);

      expect(result.span).toBe(3);
    });

    test('it sets left equal to one', () => {
      const result = appointmentSegments(appointment, range);

      expect(result.left).toBe(1);
    });

    test('it sets right equal to the length of the range', () => {
      const result = appointmentSegments(appointment, range);

      expect(result.right).toBe(3);
    });
  });

  describe('when the appointment starts and ends within the range', () => {
    const range = [
      new Date(2017, 0, 7),
      new Date(2017, 0, 8),
      new Date(2017, 0, 9),
      new Date(2017, 0, 10),
      new Date(2017, 0, 11),
      new Date(2017, 0, 12),
    ];

    test('it sets span equal to the number of days the appointment spans', () => {
      const result = appointmentSegments(appointment, range);

      expect(result.span).toBe(4);
    });

    test('it sets left equal to the 1-based index into the range where the appointment starts', () => {
      const result = appointmentSegments(appointment, range);

      expect(result.left).toBe(2);
    });

    test('it sets right equal to the 1-based index into the range where the appointment ends', () => {
      const result = appointmentSegments(appointment, range);

      expect(result.right).toBe(5);
    });
  });
});

describe('appointmentLevels', () => {
  test('it sorts the segments within each level based on their left value', () => {
    const segments = [
      { left: 2, right: 2 },
      { left: 3, right: 3 },
      { left: 1, right: 1 },
      { left: 3, right: 3 },
      { left: 1, right: 1 },
    ];

    const result = appointmentLevels(segments);

    const expectedLevels = [
      [segments[2], segments[0], segments[1]],
      [segments[4], segments[3]],
    ];
    expect(result.levels).toEqual(expectedLevels);
  });

  test('it returns a single level if no appointments overlap', () => {
    const segments = [
      { left: 1, right: 1 },
      { left: 2, right: 2 },
      { left: 3, right: 3 },
    ];

    const result = appointmentLevels(segments);

    const expectedLevels = [[segments[0], segments[1], segments[2]]];
    expect(result.levels).toEqual(expectedLevels);
  });

  describe('with no specified limit', () => {
    test('it splits up the segments into however many levels are needed based on whether they overlap', () => {
      const segments = [
        { left: 1, right: 1 },
        { left: 1, right: 1 },
        { left: 1, right: 1 },
        { left: 2, right: 2 },
        { left: 2, right: 2 },
        { left: 2, right: 2 },
        { left: 3, right: 3 },
        { left: 3, right: 3 },
        { left: 3, right: 3 },
      ];

      const result = appointmentLevels(segments);

      const expectedLevels = [
        [segments[0], segments[3], segments[6]],
        [segments[1], segments[4], segments[7]],
        [segments[2], segments[5], segments[8]],
      ];
      expect(result.levels).toEqual(expectedLevels);
    });
  });

  describe('with a specified limit', () => {
    const limit = 2;

    test('it splits segments into multiple levels when they overlap', () => {
      const segments = [
        { left: 1, right: 2 },
        { left: 2, right: 2 },
        { left: 3, right: 3 },
      ];

      const result = appointmentLevels(segments, limit);

      const expectedLevels = [[segments[0], segments[2]], [segments[1]]];
      expect(result.levels).toEqual(expectedLevels);
    });
  });
});

describe('inRange', () => {
  const day = (...args) => new Date(2015, 3, ...args);

  const rangeStart = new Date(2017, 4, 1);
  const rangeEnd = new Date(2017, 5, 1);

  describe('matrix', () => {
    const compare = (title, appointment, [start, end], result = true) => {
      it(`${title}: inRange ${result}`, () => {
        expect(inRange(appointment, start, end)).toBe(result);
      });
    };
    const weekOfThe5th = [day(5), day(11)];
    const weekOfThe12th = [day(12), day(18)];
    [
      [
        'single day with time, 1 day range',
        { start: day(11, 5), end: day(11, 6) },
        [day(11), day(11)],
        true,
      ],
      [
        'multiday w/ time, 1 day range',
        { start: day(10, 5), end: day(11, 6) },
        [day(11), day(11)],
        true,
      ],
      [
        'single day appointment, end of the week',
        { start: day(11), end: day(12) },
        weekOfThe5th,
        true,
      ],
      [
        'single day appointment, middle of the week',
        { start: day(10), end: day(11) },
        weekOfThe5th,
        true,
      ],
      [
        'single day appointment, end of the week',
        { start: day(11), end: day(12) },
        weekOfThe12th,
        false,
      ],

      ['no duration, first of the week', { start: day(12), end: day(12) }, weekOfThe12th, true],
      ['no duration, end of the week', { start: day(11), end: day(11) }, weekOfThe5th, true],
      [
        'no duration, first of the next week',
        { start: day(12), end: day(12) },
        weekOfThe5th,
        false,
      ],
      ['no duration, middle of the week', { start: day(14), end: day(14) }, weekOfThe12th, true],
      [
        'single day w/ time appointment, end of the week',
        { start: day(11, 10), end: day(11, 12) },
        weekOfThe5th,
        true,
      ],
      [
        'single day w/ time appointment, end of the week',
        { start: day(11, 10), end: day(11, 12) },
        weekOfThe12th,
        false,
      ],
      [
        'multi day w/ time appointment, end of the week',
        { start: day(11, 10), end: day(13, 12) },
        weekOfThe12th,
        true,
      ],
      [
        'single day w/ time appointment, middle of the week',
        { start: day(10, 10), end: day(10, 12) },
        weekOfThe5th,
        true,
      ],
      [
        'multi day appointment, first of the week',
        { start: day(11), end: day(13) },
        weekOfThe5th,
        true,
      ],
      [
        'multi day appointment, midnight of next the week',
        { start: day(11), end: day(13) },
        weekOfThe12th,
        true,
      ],
      [
        'multi day appointment w/ time, first of next the week',
        { start: day(11, 5), end: day(13, 5) },
        weekOfThe12th,
        true,
      ],
    ].forEach((g) => compare(...g));
  });

  test('it returns true when appointment starts before the range end and ends after the range start', () => {
    const appointment = { start: new Date(2017, 4, 12), end: new Date(2017, 4, 31) };

    const result = inRange(appointment, rangeStart, rangeEnd);

    expect(result).toBeTruthy();
  });

  test('it returns false when appointment starts before the range end and ends before the range start', () => {
    const appointment = { start: new Date(2017, 3, 25), end: new Date(2017, 3, 28) };

    const result = inRange(appointment, rangeStart, rangeEnd);

    expect(result).toBeFalsy();
  });

  test('it returns false when appointment starts after the range end and ends after the range start', () => {
    const appointment = { start: new Date(2017, 5, 2), end: new Date(2017, 5, 3) };

    const result = inRange(appointment, rangeStart, rangeEnd);

    expect(result).toBeFalsy();
  });

  test('it returns true when appointment spans the whole range', () => {
    const appointment = { start: new Date(2017, 4, 1), end: new Date(2017, 5, 1) };

    const result = inRange(appointment, rangeStart, rangeEnd);

    expect(result).toBeTruthy();
  });

  test('it uses the start of the day for the appointment start date', () => {
    const appointment = {
      start: new Date(2017, 4, 1, 12),
      end: new Date(2017, 5, 1),
    };

    const result = inRange(appointment, rangeStart, rangeEnd);

    expect(result).toBeTruthy();
  });
});

describe('segmentsOverlap', () => {
  const segment = { left: 2, right: 3 };

  describe('when at least one segment overlaps', () => {
    const nonOverlappingSegment = { left: 1, right: 1 };

    test('when the overlapping segment partially overlaps on the left', () => {
      const overlappingSegment = { left: 1, right: 2 };
      const otherSegments = [nonOverlappingSegment, overlappingSegment];

      const result = segmentsOverlap(segment, otherSegments);

      expect(result).toBeTruthy();
    });

    test('when the overlapping segment partially overlaps on the right', () => {
      const overlappingSegment = { left: 3, right: 3 };
      const otherSegments = [nonOverlappingSegment, overlappingSegment];

      const result = segmentsOverlap(segment, otherSegments);

      expect(result).toBeTruthy();
    });

    test('when the overlapping segment fully overlaps', () => {
      const overlappingSegment = { left: 1, right: 4 };
      const otherSegments = [nonOverlappingSegment, overlappingSegment];

      const result = segmentsOverlap(segment, otherSegments);

      expect(result).toBeTruthy();
    });

    test('when the overlapping segment is identical', () => {
      const overlappingSegment = { left: 2, right: 3 };
      const otherSegments = [nonOverlappingSegment, overlappingSegment];

      const result = segmentsOverlap(segment, otherSegments);

      expect(result).toBeTruthy();
    });
  });

  test('it returns false if segment overlaps with no other segments', () => {
    const segmentToTheLeft = { left: 1, right: 1 };
    const segmentToTheRight = { left: 4, right: 5 };
    const otherSegments = [segmentToTheLeft, segmentToTheRight];

    const result = segmentsOverlap(segment, otherSegments);

    expect(result).toBeFalsy();
  });
});

describe('sortAppointments', () => {
  describe('when the appointments start on different calendar days', () => {
    const earlierAppointment = {
      start: new Date(2017, 0, 1),
      end: new Date(2017, 0, 3),
    };
    const laterAppointment = {
      start: new Date(2017, 0, 2),
      end: new Date(2017, 0, 3),
    };

    test('it returns a positive number when appointment B starts on a day before the start day of appointment A', () => {
      const result = sortAppointments(laterAppointment, earlierAppointment);

      expect(result).toBeGreaterThan(0);
    });

    test('it returns a negative number when appointment A starts on a day before the start day of appointment B', () => {
      const result = sortAppointments(earlierAppointment, laterAppointment);

      expect(result).toBeLessThan(0);
    });
  });

  describe('when the appointments start on the same calendar day', () => {
    describe('when the appointments have different durations', () => {
      const shorterAppointment = {
        start: new Date(2017, 0, 1),
        end: new Date(2017, 0, 2),
      };
      const longerAppointment = {
        start: new Date(2017, 0, 1),
        end: new Date(2017, 0, 4),
      };

      test('it returns a positive number when appointment B has a longer duration than appointment A', () => {
        const result = sortAppointments(shorterAppointment, longerAppointment);

        expect(result).toBeGreaterThan(0);
      });

      test('it returns a negative number when appointment A has a longer duration than appointment B', () => {
        const result = sortAppointments(longerAppointment, shorterAppointment);

        expect(result).toBeLessThan(0);
      });
    });

    describe('when the appointments have the same duration', () => {
      describe('when only one of the appointments is an all day appointment', () => {
        const allDayAppointment = {
          start: new Date(2017, 0, 1),
          end: new Date(2017, 0, 2),
          allDay: true,
        };
        const nonAllDayAppointment = {
          start: new Date(2017, 0, 1),
          end: new Date(2017, 0, 2),
          allDay: false,
        };

        test('it returns a positive number when appointment B is an all day appointment', () => {
          const result = sortAppointments(nonAllDayAppointment, allDayAppointment);

          expect(result).toBeGreaterThan(0);
        });

        test('it returns a negative number when appointment A is an all day appointment', () => {
          const result = sortAppointments(allDayAppointment, nonAllDayAppointment);

          expect(result).toBeLessThan(0);
        });
      });

      describe('when both of the appointments are all day appointments', () => {
        const allDayAppointment = {
          start: new Date(2017, 0, 1),
          end: new Date(2017, 0, 2),
          allDay: true,
        };
        const otherAllDayAppointment = {
          start: new Date(2017, 0, 1),
          end: new Date(2017, 0, 2),
          allDay: true,
        };

        test('it returns zero', () => {
          const result = sortAppointments(allDayAppointment, otherAllDayAppointment);

          expect(result).toBe(0);
        });
      });

      describe('when neither of the appointments are all day appointments', () => {
        const earlierAppointment = {
          start: new Date(2017, 0, 1, 12),
          end: new Date(2017, 0, 2),
          allDay: false,
        };
        const laterAppointment = {
          start: new Date(2017, 0, 1, 16),
          end: new Date(2017, 0, 2),
          allDay: false,
        };

        test('it returns a positive number when appointment B starts at an earlier time than appointment A', () => {
          const result = sortAppointments(laterAppointment, earlierAppointment);

          expect(result).toBeGreaterThan(0);
        });

        test('it returns a negative number when appointment A starts at an earlier time than appointment B', () => {
          const result = sortAppointments(earlierAppointment, laterAppointment);

          expect(result).toBeLessThan(0);
        });

        test('it returns zero when both appointments start at the same time', () => {
          const otherEarlierAppointment = { ...earlierAppointment };
          const result = sortAppointments(earlierAppointment, otherEarlierAppointment);

          expect(result).toBe(0);
        });
      });
    });
  });
});
