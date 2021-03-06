import PropTypes from 'prop-types';
import React, { useRef, useEffect } from 'react';
import addClass from 'dom-helpers/addClass';
import removeClass from 'dom-helpers/removeClass';
import getWidth from 'dom-helpers/width';
import scrollbarSize from 'dom-helpers/scrollbarSize';

import * as dates from 'utils/dates';
import { navigate } from 'utils/constants';
import { inRange } from 'utils/appointment-levels';

const Agenda = ({ localizer, components, length, currentDate, appointments }) => {
  const headerRef = useRef(null);
  const dateColRef = useRef(null);
  const timeColRef = useRef(null);
  const contentRef = useRef(null);
  const tbodyRef = useRef(null);
  const adjustHeader = () => {
    if (!tbodyRef.current) return;

    const header = headerRef.current;
    const firstRow = tbodyRef.current.firstChild;

    if (!firstRow) return;

    const isOverflowing = contentRef.current.scrollHeight > contentRef.current.clientHeight;

    let _widths = [];
    const widths = _widths;

    _widths = [getWidth(firstRow.children[0]), getWidth(firstRow.children[1])];

    if (widths[0] !== _widths[0] || widths[1] !== _widths[1]) {
      dateColRef.current.style.width = `${_widths[0]}px`;
      timeColRef.current.style.width = `${_widths[1]}px`;
    }

    if (isOverflowing) {
      addClass(header, 'rbc-header-overflowing');
      header.style.marginRight = `${scrollbarSize()}px`;
    } else {
      removeClass(header, 'rbc-header-overflowing');
    }
  };

  useEffect(() => {
    adjustHeader();
  });

  const renderDay = (day, appointments, dayKey) => {
    const { appointment: Appointment, currentDate: AgendaDate } = components;

    appointments = appointments.filter((e) =>
      inRange(e, dates.startOf(day, 'day'), dates.endOf(day, 'day'))
    );

    return appointments.map((appointment, idx) => {
      const { title } = appointment;

      const dateLabel = idx === 0 && localizer.format(day, 'agendaDateFormat');
      const first =
        idx === 0 ? (
          <td rowSpan={appointments.length} className="rbc-agenda-date-cell">
            {AgendaDate ? <AgendaDate day={day} label={dateLabel} /> : dateLabel}
          </td>
        ) : (
          false
        );

      return (
        <tr key={`${dayKey}`}>
          {first}
          <td className="rbc-agenda-time-cell">{timeRangeLabel(day, appointment)}</td>
          <td className="rbc-agenda-appointment-cell">
            <Appointment appointment={appointment}>{title}</Appointment>
          </td>
        </tr>
      );
    }, []);
  };

  const timeRangeLabel = (day, appointment) => {
    let labelClass = '';
    const TimeComponent = components.time;
    let label = localizer.messages.allDay;

    const { start, end, allDay } = appointment;

    if (!allDay) {
      if (dates.eq(start, end)) {
        label = localizer.format(start, 'agendaTimeFormat');
      } else if (dates.eq(start, end, 'day')) {
        label = localizer.format({ start, end }, 'agendaTimeRangeFormat');
      } else if (dates.eq(day, start, 'day')) {
        label = localizer.format(start, 'agendaTimeFormat');
      } else if (dates.eq(day, end, 'day')) {
        label = localizer.format(end, 'agendaTimeFormat');
      }
    }

    if (dates.gt(day, start, 'day')) labelClass = 'rbc-continues-prior';
    if (dates.lt(day, end, 'day')) labelClass += ' rbc-continues-after';

    return (
      <span className={labelClass.trim()}>
        {TimeComponent ? (
          <TimeComponent appointment={appointment} day={day} label={label} />
        ) : (
          label
        )}
      </span>
    );
  };

  const { messages } = localizer;
  const end = dates.add(currentDate, length, 'day');

  const range = dates.range(currentDate, end, 'day');

  appointments = appointments.filter((appointment) => inRange(appointment, currentDate, end));

  appointments.sort((a, b) => +a.start - +b.start);

  return (
    <div className="rbc-agenda-view">
      {appointments.length !== 0 ? (
        <>
          <table ref={headerRef} className="rbc-agenda-table">
            <thead>
              <tr>
                <th className="rbc-header" ref={dateColRef}>
                  {messages.date}
                </th>
                <th className="rbc-header" ref={timeColRef}>
                  {messages.time}
                </th>
                <th className="rbc-header">{messages.appointment}</th>
              </tr>
            </thead>
          </table>
          <div className="rbc-agenda-content" ref={contentRef}>
            <table className="rbc-agenda-table">
              <tbody ref={tbodyRef}>
                {range.map((day, idx) => renderDay(day, appointments, idx))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <span className="rbc-agenda-empty">{messages.noAppointmentsInRange}</span>
      )}
    </div>
  );
};

Agenda.propTypes = {
  appointments: PropTypes.array,
  currentDate: PropTypes.instanceOf(Date),
  length: PropTypes.number.isRequired,

  components: PropTypes.object.isRequired,
  localizer: PropTypes.object.isRequired,
};

Agenda.defaultProps = {
  length: 30,
};

Agenda.range = (start, { length = Agenda.defaultProps.length }) => {
  const end = dates.add(start, length, 'day');
  return { start, end };
};

Agenda.navigate = (date, action, { length = Agenda.defaultProps.length }) => {
  switch (action) {
    case navigate.PREVIOUS:
      return dates.add(date, -length, 'day');

    case navigate.NEXT:
      return dates.add(date, length, 'day');

    default:
      return date;
  }
};

Agenda.title = (start, { length = Agenda.defaultProps.length, localizer }) => {
  const end = dates.add(start, length, 'day');
  return localizer.format({ start, end }, 'agendaHeaderFormat');
};

export default Agenda;
