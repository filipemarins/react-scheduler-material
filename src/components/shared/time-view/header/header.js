import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import scrollbarSize from 'dom-helpers/scrollbarSize';

import * as dates from 'utils/dates';
import ContentRow from 'components/shared/content-row';
import NoopWrapper from 'components/shared/noop-wrapper';

class Header extends React.Component {
  handleHeaderClick = (e, date) => {
    e.preventDefault();
    this.props.onDayClick(date);
  };

  renderHeaderCells(range) {
    const {
      localizer,
      currentDate,
      components: { header: HeaderComponent = NoopWrapper },
    } = this.props;

    const today = currentDate;

    return range.map((date, i) => {
      const label = localizer.format(date, 'dayFormat');

      const header = (
        <HeaderComponent date={date} localizer={localizer}>
          {label}
        </HeaderComponent>
      );

      return (
        <div key={i} className={clsx('rbc-header', dates.eq(date, today, 'day') && 'rbc-today')}>
          <span
            onClick={(e) => this.handleHeaderClick(e, date)}
            onKeyPress={(e) => this.handleHeadingClick(e, date)}
            role="link"
            tabIndex="0"
          >
            {header}
          </span>
        </div>
      );
    });
  }

  renderRow = () => {
    const { appointments, rtl, selectable, currentDate, range, localizer, components } = this.props;

    return (
      <ContentRow
        isAllDay
        rtl={rtl}
        currentDate={currentDate}
        minRows={2}
        range={range}
        className="rbc-allday-cell"
        selectable={selectable}
        selectedAppointment={this.props.selectedAppointment}
        components={components}
        localizer={localizer}
        onSelect={this.props.onSelectAppointment}
        onDoubleClick={this.props.onDoubleClickAppointment}
        onSelectSlot={this.props.onSelectSlot}
      />
    );
  };

  render() {
    const {
      width,
      rtl,
      range,
      appointments,
      currentDate,
      selectable,
      components,
      scrollRef,
      localizer,
      isOverflowing,
      components: { timeGutterHeader: TimeGutterHeader },
    } = this.props;

    const style = {};
    if (isOverflowing) {
      style[rtl ? 'marginLeft' : 'marginRight'] = `${scrollbarSize()}px`;
    }

    return (
      <div
        style={style}
        ref={scrollRef}
        className={clsx('rbc-time-header', isOverflowing && 'rbc-overflowing')}
      >
        <div
          className="rbc-label rbc-time-header-gutter"
          style={{ width, minWidth: width, maxWidth: width }}
        >
          {TimeGutterHeader && <TimeGutterHeader />}
        </div>

        <div className="rbc-time-header-content">
          <div
            className={`rbc-row rbc-time-header-cell${
              range.length <= 1 ? ' rbc-time-header-cell-single-day' : ''
            }`}
          >
            {this.renderHeaderCells(range)}
          </div>
          <ContentRow
            isAllDay
            rtl={rtl}
            currentDate={currentDate}
            minRows={2}
            range={range}
            appointments={[]}
            className="rbc-allday-cell"
            selectable={selectable}
            selectedAppointment={this.props.selectedAppointment}
            components={components}
            localizer={localizer}
            onSelect={this.props.onSelectAppointment}
            onDoubleClick={this.props.onDoubleClickAppointment}
            onSelectSlot={this.props.onSelectSlot}
          />
        </div>
      </div>
    );
  }
}

Header.propTypes = {
  range: PropTypes.array.isRequired,
  appointments: PropTypes.array.isRequired,
  currentDate: PropTypes.instanceOf(Date),
  isOverflowing: PropTypes.bool,

  rtl: PropTypes.bool,
  width: PropTypes.number,

  localizer: PropTypes.object.isRequired,
  components: PropTypes.object.isRequired,

  selectedAppointment: PropTypes.object,
  selectable: PropTypes.oneOf([true, false, 'ignoreAppointments']),

  onSelectSlot: PropTypes.func,
  onSelectAppointment: PropTypes.func,
  onDoubleClickAppointment: PropTypes.func,
  onDayClick: PropTypes.func,
  scrollRef: PropTypes.any,
};

export default Header;
