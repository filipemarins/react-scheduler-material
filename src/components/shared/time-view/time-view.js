import React, { Component } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import * as animationFrame from 'dom-helpers/animationFrame';
import getWidth from 'dom-helpers/width';
import { findDOMNode } from 'react-dom';

import * as dates from 'utils/dates';
import { inRange, sortAppointments } from 'utils/appointment-levels';
import DayColumn from './day-column';
import TimeViewHeader from './header';
import TimeScale from './time-scale';

export default class TimeView extends Component {
  constructor(props) {
    super(props);

    this.state = { gutterWidth: undefined, isOverflowing: null };

    this.scrollRef = React.createRef();
    this.contentRef = React.createRef();
    this._scrollRatio = null;
  }

  componentDidMount() {
    this.checkOverflow();

    if (this.props.width == null) {
      this.measureGutter();
    }

    this.applyScroll();

    window.addEventListener('resize', this.handleResize);
  }

  handleScroll = (e) => {
    if (this.scrollRef.current) {
      this.scrollRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  handleResize = () => {
    animationFrame.cancel(this.rafHandle);
    this.rafHandle = animationFrame.request(this.checkOverflow);
  };

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);

    animationFrame.cancel(this.rafHandle);

    if (this.measureGutterAnimationFrameRequest) {
      window.cancelAnimationFrame(this.measureGutterAnimationFrameRequest);
    }
  }

  componentDidUpdate() {
    if (this.props.width == null) {
      this.measureGutter();
    }

    this.applyScroll();
    // this.checkOverflow()
  }

  gutterRef = (ref) => {
    this.gutter = ref && findDOMNode(ref);
  };

  handleSelectAlldayAppointment = (args) => {
    // cancel any pending selections so only the appointment click goes through.
    this.clearSelection();
    this.props.onSelectAppointment(args);
  };

  clearSelection() {
    clearTimeout(this._selectTimer);
    this._pendingSelection = [];
  }

  measureGutter() {
    if (this.measureGutterAnimationFrameRequest) {
      window.cancelAnimationFrame(this.measureGutterAnimationFrameRequest);
    }
    this.measureGutterAnimationFrameRequest = window.requestAnimationFrame(() => {
      const width = getWidth(this.gutter);

      if (width && this.state.gutterWidth !== width) {
        this.setState({ gutterWidth: width });
      }
    });
  }

  applyScroll() {
    if (this._scrollRatio != null) {
      const content = this.contentRef.current;
      content.scrollTop = content.scrollHeight * this._scrollRatio;
      // Only do this once
      this._scrollRatio = null;
    }
  }

  checkOverflow = () => {
    if (this._updatingOverflow) return;

    const content = this.contentRef.current;
    const isOverflowing = content.scrollHeight > content.clientHeight;

    if (this.state.isOverflowing !== isOverflowing) {
      this._updatingOverflow = true;
      this.setState({ isOverflowing }, () => {
        this._updatingOverflow = false;
      });
    }
  };

  renderAppointments(range, appointments, now) {
    const { min, max, components, localizer } = this.props;

    return range.map((date) => {
      const daysAppointments = appointments.filter((appointment) =>
        dates.inRange(date, appointment.start, appointment.end, 'day')
      );
      return (
        <DayColumn
          {...this.props}
          localizer={localizer}
          min={dates.merge(date, min)}
          max={dates.merge(date, max)}
          components={components}
          isNow={dates.eq(date, now, 'day')}
          key={date}
          date={date}
          appointments={daysAppointments}
        />
      );
    });
  }

  render() {
    let {
      appointments,
      range,
      width,
      rtl,
      selectedAppointment,
      currentDate,
      components,
      localizer,
      min,
      max,
      showMultiDayTimes,
    } = this.props;

    width = width || this.state.gutterWidth;

    const start = range[0];
    const end = range[range.length - 1];

    this.slots = range.length;

    // TODO: Move this to utils
    const allDayAppointments = [];
    const rangeAppointments = [];
    appointments.forEach((appointment) => {
      if (inRange(appointment, start, end)) {
        const appointmentStart = appointment.start;
        const appointmentEnd = appointment.end;
        if (
          appointment.allDay ||
          (dates.isJustDate(appointmentStart) && dates.isJustDate(appointmentEnd)) ||
          (!showMultiDayTimes && !dates.eq(appointmentStart, appointmentEnd, 'day'))
        ) {
          allDayAppointments.push(appointment);
        } else {
          rangeAppointments.push(appointment);
        }
      }
    });

    allDayAppointments.sort((a, b) => sortAppointments(a, b));

    return (
      <div className={clsx('rbc-time-view')}>
        <TimeViewHeader
          range={range}
          appointments={allDayAppointments}
          width={width}
          rtl={rtl}
          currentDate={currentDate}
          localizer={localizer}
          selectedAppointment={selectedAppointment}
          components={components}
          scrollRef={this.scrollRef}
          isOverflowing={this.state.isOverflowing}
          onSelectAppointment={this.handleSelectAlldayAppointment}
          onDoubleClickAppointment={this.props.onDoubleClickAppointment}
          onDayClick={this.props.onDayClick}
        />
        <div ref={this.contentRef} className="rbc-time-content" onScroll={this.handleScroll}>
          <TimeScale
            date={start}
            ref={this.gutterRef}
            localizer={localizer}
            min={dates.merge(start, min)}
            max={dates.merge(start, max)}
            currentDate={this.props.currentDate}
            components={components}
            className="rbc-time-gutter"
          />
          {this.renderAppointments(range, rangeAppointments, currentDate)}
        </div>
      </div>
    );
  }
}

TimeView.propTypes = {
  appointments: PropTypes.array.isRequired,

  range: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  min: PropTypes.instanceOf(Date),
  max: PropTypes.instanceOf(Date),
  currentDate: PropTypes.instanceOf(Date),

  showMultiDayTimes: PropTypes.bool,

  rtl: PropTypes.bool,
  width: PropTypes.number,

  components: PropTypes.object.isRequired,
  localizer: PropTypes.object.isRequired,

  selectedAppointment: PropTypes.object,

  onSelectAppointment: PropTypes.func,
  onDoubleClickAppointment: PropTypes.func,
  onDayClick: PropTypes.func,
};

TimeView.defaultProps = {
  min: dates.startOf(new Date(), 'day'),
  max: dates.endOf(new Date(), 'day'),
};
