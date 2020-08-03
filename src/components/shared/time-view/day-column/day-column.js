import PropTypes from 'prop-types';
import React from 'react';
import { findDOMNode } from 'react-dom';
import clsx from 'clsx';

import * as dates from 'utils/dates';
import getTimeSlotMetrics from 'utils/get-time-slot-metrics';
import { isSelected } from 'utils/selection';
import { notify } from 'utils/helpers';
import { DayLayoutAlgorithmPropType } from 'utils/prop-types';
import * as DayEventLayout from 'utils/day-event-layout';

import Selection, { getBoundsForNode, isEvent } from 'components/selection';
import TimeSlot from '../time-slot';
import Event from './event';

class DayColumn extends React.Component {
  state = { selecting: false, timeIndicatorPosition: null };

  intervalTriggered = false;

  constructor(...args) {
    super(...args);

    this.slotMetrics = getTimeSlotMetrics(this.props);
  }

  componentDidMount() {
    this.props.selectable && this._selectable();

    if (this.props.isNow) {
      this.setTimeIndicatorPositionUpdateInterval();
    }
  }

  componentWillUnmount() {
    this._teardownSelectable();
    this.clearTimeIndicatorInterval();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.selectable && !this.props.selectable) this._selectable();
    if (!nextProps.selectable && this.props.selectable) this._teardownSelectable();

    this.slotMetrics = this.slotMetrics.update(nextProps);
  }

  componentDidUpdate(prevProps, prevState) {
    const getNowChanged = !dates.eq(prevProps.getNow(), this.props.getNow(), 'minutes');

    if (prevProps.isNow !== this.props.isNow || getNowChanged) {
      this.clearTimeIndicatorInterval();

      if (this.props.isNow) {
        const tail =
          !getNowChanged &&
          dates.eq(prevProps.date, this.props.date, 'minutes') &&
          prevState.timeIndicatorPosition === this.state.timeIndicatorPosition;

        this.setTimeIndicatorPositionUpdateInterval(tail);
      }
    } else if (
      this.props.isNow &&
      (!dates.eq(prevProps.min, this.props.min, 'minutes') ||
        !dates.eq(prevProps.max, this.props.max, 'minutes'))
    ) {
      this.positionTimeIndicator();
    }
  }

  /**
   * @param tail {Boolean} - whether `positionTimeIndicator` call should be
   *   deferred or called upon setting interval (`true` - if deferred);
   */
  setTimeIndicatorPositionUpdateInterval(tail = false) {
    if (!this.intervalTriggered && !tail) {
      this.positionTimeIndicator();
    }

    this._timeIndicatorTimeout = window.setTimeout(() => {
      this.intervalTriggered = true;
      this.positionTimeIndicator();
      this.setTimeIndicatorPositionUpdateInterval();
    }, 60000);
  }

  clearTimeIndicatorInterval() {
    this.intervalTriggered = false;
    window.clearTimeout(this._timeIndicatorTimeout);
  }

  positionTimeIndicator() {
    const { min, max, getNow } = this.props;
    const current = getNow();

    if (current >= min && current <= max) {
      const top = this.slotMetrics.getCurrentTimePosition(current);
      this.intervalTriggered = true;
      this.setState({ timeIndicatorPosition: top });
    } else {
      this.clearTimeIndicatorInterval();
    }
  }

  render() {
    const {
      max,
      rtl,
      isNow,
      resource,
      accessors,
      localizer,
      getters: { dayProp, ...getters },
      components: { eventContainerWrapper: EventContainer, ...components },
    } = this.props;

    const { slotMetrics } = this;
    const { selecting, top, height, startDate, endDate } = this.state;

    const selectDates = { start: startDate, end: endDate };

    const { className, style } = dayProp(max);

    return (
      <div
        style={style}
        className={clsx(
          className,
          'rbc-day-slot',
          'rbc-time-column',
          isNow && 'rbc-now',
          isNow && 'rbc-today', // WHY
          selecting && 'rbc-slot-selecting'
        )}
      >
        {slotMetrics.groups.map((grp, idx) => (
          <TimeSlot
            key={idx}
            group={grp}
            resource={resource}
            getters={getters}
            components={components}
          />
        ))}
        <EventContainer
          localizer={localizer}
          resource={resource}
          accessors={accessors}
          getters={getters}
          components={components}
          slotMetrics={slotMetrics}
        >
          <div className={clsx('rbc-events-container', rtl && 'rtl')}>{this.renderEvents()}</div>
        </EventContainer>

        {selecting && (
          <div className="rbc-slot-selection" style={{ top, height }}>
            <span>{localizer.format(selectDates, 'selectRangeFormat')}</span>
          </div>
        )}
        {isNow && this.intervalTriggered && (
          <div
            className="rbc-current-time-indicator"
            style={{ top: `${this.state.timeIndicatorPosition}%` }}
          />
        )}
      </div>
    );
  }

  renderEvents = () => {
    const {
      events,
      rtl,
      selected,
      accessors,
      localizer,
      getters,
      components,
      step,
      timeslots,
      dayLayoutAlgorithm,
    } = this.props;

    const { slotMetrics } = this;
    const { messages } = localizer;

    const styledEvents = DayEventLayout.getStyledEvents({
      events,
      accessors,
      slotMetrics,
      minimumStartDifference: Math.ceil((step * timeslots) / 2),
      dayLayoutAlgorithm,
    });

    return styledEvents.map(({ event, style }, idx) => {
      const end = accessors.end(event);
      const start = accessors.start(event);
      let format = 'eventTimeRangeFormat';
      let label;

      const startsBeforeDay = slotMetrics.startsBeforeDay(start);
      const startsAfterDay = slotMetrics.startsAfterDay(end);

      if (startsBeforeDay) format = 'eventTimeRangeEndFormat';
      else if (startsAfterDay) format = 'eventTimeRangeStartFormat';

      if (startsBeforeDay && startsAfterDay) label = messages.allDay;
      else label = localizer.format({ start, end }, format);

      const continuesEarlier = startsBeforeDay || slotMetrics.startsBefore(start);
      const continuesLater = startsAfterDay || slotMetrics.startsAfter(end);

      return (
        <Event
          style={style}
          event={event}
          label={label}
          key={`evt_${idx}`}
          getters={getters}
          rtl={rtl}
          components={components}
          continuesEarlier={continuesEarlier}
          continuesLater={continuesLater}
          accessors={accessors}
          selected={isSelected(event, selected)}
          onClick={(e) => this._select(event, e)}
          onDoubleClick={(e) => this._doubleClick(event, e)}
        />
      );
    });
  };

  _selectable = () => {
    const node = findDOMNode(this);
    const selector = (this._selector = new Selection(() => findDOMNode(this), {
      longPressThreshold: this.props.longPressThreshold,
    }));

    const maybeSelect = (box) => {
      const { onSelecting } = this.props;
      const current = this.state || {};
      const state = selectionState(box);
      const { startDate: start, endDate: end } = state;

      if (onSelecting) {
        if (
          (dates.eq(current.startDate, start, 'minutes') &&
            dates.eq(current.endDate, end, 'minutes')) ||
          onSelecting({ start, end, resourceId: this.props.resource }) === false
        )
          return;
      }

      if (
        this.state.start !== state.start ||
        this.state.end !== state.end ||
        this.state.selecting !== state.selecting
      ) {
        this.setState(state);
      }
    };

    let selectionState = (point) => {
      let currentSlot = this.slotMetrics.closestSlotFromPoint(point, getBoundsForNode(node));

      if (!this.state.selecting) {
        this._initialSlot = currentSlot;
      }

      let initialSlot = this._initialSlot;
      if (dates.lte(initialSlot, currentSlot)) {
        currentSlot = this.slotMetrics.nextSlot(currentSlot);
      } else if (dates.gt(initialSlot, currentSlot)) {
        initialSlot = this.slotMetrics.nextSlot(initialSlot);
      }

      const selectRange = this.slotMetrics.getRange(
        dates.min(initialSlot, currentSlot),
        dates.max(initialSlot, currentSlot)
      );

      return {
        ...selectRange,
        selecting: true,

        top: `${selectRange.top}%`,
        height: `${selectRange.height}%`,
      };
    };

    const selectorClicksHandler = (box, actionType) => {
      if (!isEvent(findDOMNode(this), box)) {
        const { startDate, endDate } = selectionState(box);
        this._selectSlot({
          startDate,
          endDate,
          action: actionType,
          box,
        });
      }
      this.setState({ selecting: false });
    };

    selector.on('selecting', maybeSelect);
    selector.on('selectStart', maybeSelect);

    selector.on('beforeSelect', (box) => {
      if (this.props.selectable !== 'ignoreEvents') return;

      return !isEvent(findDOMNode(this), box);
    });

    selector.on('click', (box) => selectorClicksHandler(box, 'click'));

    selector.on('doubleClick', (box) => selectorClicksHandler(box, 'doubleClick'));

    selector.on('select', (bounds) => {
      if (this.state.selecting) {
        this._selectSlot({ ...this.state, action: 'select', bounds });
        this.setState({ selecting: false });
      }
    });

    selector.on('reset', () => {
      if (this.state.selecting) {
        this.setState({ selecting: false });
      }
    });
  };

  _teardownSelectable = () => {
    if (!this._selector) return;
    this._selector.teardown();
    this._selector = null;
  };

  _selectSlot = ({ startDate, endDate, action, bounds, box }) => {
    let current = startDate;
    const slots = [];

    while (dates.lte(current, endDate)) {
      slots.push(current);
      current = new Date(+current + this.props.step * 60 * 1000); // using Date ensures not to create an endless loop the day DST begins
    }

    notify(this.props.onSelectSlot, {
      slots,
      start: startDate,
      end: endDate,
      resourceId: this.props.resource,
      action,
      bounds,
      box,
    });
  };

  _select = (...args) => {
    notify(this.props.onSelectEvent, args);
  };

  _doubleClick = (...args) => {
    notify(this.props.onDoubleClickEvent, args);
  };
}

DayColumn.propTypes = {
  events: PropTypes.array.isRequired,
  step: PropTypes.number.isRequired,
  date: PropTypes.instanceOf(Date).isRequired,
  min: PropTypes.instanceOf(Date).isRequired,
  max: PropTypes.instanceOf(Date).isRequired,
  getNow: PropTypes.func.isRequired,
  isNow: PropTypes.bool,

  rtl: PropTypes.bool,

  accessors: PropTypes.object.isRequired,
  components: PropTypes.object.isRequired,
  getters: PropTypes.object.isRequired,
  localizer: PropTypes.object.isRequired,

  showMultiDayTimes: PropTypes.bool,
  culture: PropTypes.string,
  timeslots: PropTypes.number,

  selected: PropTypes.object,
  selectable: PropTypes.oneOf([true, false, 'ignoreEvents']),
  eventOffset: PropTypes.number,
  longPressThreshold: PropTypes.number,

  onSelecting: PropTypes.func,
  onSelectSlot: PropTypes.func.isRequired,
  onSelectEvent: PropTypes.func.isRequired,
  onDoubleClickEvent: PropTypes.func.isRequired,

  className: PropTypes.string,
  dragThroughEvents: PropTypes.bool,
  resource: PropTypes.any,

  dayLayoutAlgorithm: DayLayoutAlgorithmPropType,
};

DayColumn.defaultProps = {
  dragThroughEvents: true,
  timeslots: 2,
};

export default DayColumn;