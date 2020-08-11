import React from 'react';
import PropTypes from 'prop-types';

import { isSelected } from 'utils/selection';

import AppointmentCell from './appointment-cell';

/* eslint-disable react/prop-types */
export default {
  propTypes: {
    slotMetrics: PropTypes.object.isRequired,

    selectedAppointment: PropTypes.object,
    isAllDay: PropTypes.bool,

    localizer: PropTypes.object.isRequired,
    components: PropTypes.object.isRequired,

    onSelectAppointment: PropTypes.func,
    onDoubleClick: PropTypes.func,
  },

  defaultProps: {
    segments: [],
    selectedAppointment: {},
  },

  renderAppointment(props, appointment) {
    const {
      selectedAppointment,
      isAllDay: _,
      onSelectAppointment,
      onDoubleClick,
      localizer,
      slotMetrics,
      components,
    } = props;

    const continuesPrior = slotMetrics.continuesPrior(appointment);
    const continuesAfter = slotMetrics.continuesAfter(appointment);

    return (
      <AppointmentCell
        appointment={appointment}
        localizer={localizer}
        components={components}
        onSelectAppointment={onSelectAppointment}
        onDoubleClick={onDoubleClick}
        continuesPrior={continuesPrior}
        continuesAfter={continuesAfter}
        slotStart={slotMetrics.first}
        slotEnd={slotMetrics.last}
        selectedAppointment={isSelected(appointment, selectedAppointment)}
      />
    );
  },

  renderSpan(slots, len, key, content = ' ') {
    const per = `${(Math.abs(len) / slots) * 100}%`;

    return (
      <div
        key={key}
        className="rbc-row-segment"
        // IE10/11 need max-width. flex-basis doesn't respect box-sizing
        style={{ WebkitFlexBasis: per, flexBasis: per, maxWidth: per }}
      >
        {content}
      </div>
    );
  },
};