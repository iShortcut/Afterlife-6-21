import { Controller } from 'react-hook-form';
import { RadioGroup } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { EventVisibility } from '@/types'; // Import our new type

// Updated visibility options to match the new EventVisibility enum
const visibilityOptions: {
  value: EventVisibility;
  name: string;
  description: string;
}[] = [
  {
    value: 'public',
    name: 'Public',
    description: 'Anyone can see and join this event.',
  },
  {
    value: 'family_only',
    name: 'Family Only',
    description: 'Only invited family members can see this event.',
  },
  {
    value: 'invitees_only',
    name: 'Invitees Only',
    description: 'Only people who are explicitly invited can see this event.',
  },
];

function classNames(...classes: (string | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}

interface EventVisibilitySelectorProps {
  control: any;
  name: string;
}

export default function EventVisibilitySelector({ control, name }: EventVisibilitySelectorProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value } }) => (
        <RadioGroup value={value} onChange={onChange}>
          <RadioGroup.Label className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
            Event Visibility
          </RadioGroup.Label>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose who can see and attend your event.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-3 sm:gap-x-4">
            {visibilityOptions.map((option) => (
              <RadioGroup.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  classNames(
                    'relative flex cursor-pointer rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm focus:outline-none',
                    'dark:border-gray-600',
                    active ? 'border-indigo-600 ring-2 ring-indigo-600' : 'border-gray-300'
                  )
                }
              >
                {({ checked, active }) => (
                  <>
                    <span className="flex flex-1">
                      <span className="flex flex-col">
                        <RadioGroup.Label as="span" className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                          {option.name}
                        </RadioGroup.Label>
                        <RadioGroup.Description as="span" className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                          {option.description}
                        </RadioGroup.Description>
                      </span>
                    </span>
                    <CheckCircleIcon
                      className={classNames(!checked ? 'invisible' : '', 'h-5 w-5 text-indigo-600')}
                      aria-hidden="true"
                    />
                    <span
                      className={classNames(
                        active ? 'border' : 'border-2',
                        checked ? 'border-indigo-600' : 'border-transparent',
                        'pointer-events-none absolute -inset-px rounded-lg'
                      )}
                      aria-hidden="true"
                    />
                  </>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>
      )}
    />
  );
}