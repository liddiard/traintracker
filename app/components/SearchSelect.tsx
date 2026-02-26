import Select, {
  ClassNamesConfig,
  components,
  GroupBase,
  InputProps,
  SelectInstance,
  Theme,
} from 'react-select'
import { InputType, Option } from '../types'
import { JSX, RefObject } from 'react'

const selectClassNames = {
  // fix fields displaying too wide on Firefox when all filled with values
  // https://github.com/JedWatson/react-select/issues/5170
  container: () => 'grid grid-cols-[minmax(0,1fr)]',
  indicatorsContainer: () => 'hidden!',
  menu: () => 'dark:bg-positron-gray-700! dark:text-white!',
  control: () => 'bg-white/10! border! border-white/60!',
  singleValue: () => 'text-white!',
  input: () => 'text-white! cursor-text',
  placeholder: () => 'text-white/60!',
}

const selectTheme = (theme: Theme) =>
  ({
    ...theme,
    colors: {
      ...theme.colors,
      // matches the Tailwind color definition for `amtrak-blue-500`
      primary: 'rgb(0, 109, 147)',
      // matches the Tailwind color definition for `amtrak-blue-200`
      primary75: 'rgba(111, 203, 245, 0.75)',
      primary50: 'rgba(111, 203, 245, 0.5)',
      primary25: 'rgba(111, 203, 245, 0.25)',
    },
  }) as Theme

const Input = (props: InputProps<Option>) => (
  <components.Input
    {...props}
    // fix React hydration issue: https://github.com/JedWatson/react-select/issues/5459#issuecomment-1875022105
    aria-activedescendant={undefined}
  />
)

const NumberInput = (props: InputProps<Option>) => (
  <components.Input
    {...props}
    inputMode="numeric"
    pattern="[0-9]*"
    aria-activedescendant={undefined}
  />
)

function SearchSelect({
  instanceId,
  name,
  options,
  value,
  placeholder,
  className,
  classNames,
  onChange,
  formatOptionLabel,
  onFocus,
  autoFocus,
  ref = null,
  inputType = InputType.TEXT,
  required = false,
  styles = {},
}: {
  instanceId: string
  name: string
  options: Option[]
  value: Option | null
  placeholder: string
  className: string
  classNames?: ClassNamesConfig<Option, false, GroupBase<Option>> | undefined
  onChange: (option: Option | null) => void
  formatOptionLabel?: (option: Option) => JSX.Element
  onFocus?: () => void
  ref?: RefObject<SelectInstance<Option> | null> | null
  inputType?: InputType
  required?: boolean
  autoFocus?: boolean
  styles?: object
}) {
  return (
    <Select
      instanceId={instanceId}
      ref={ref}
      name={name}
      placeholder={placeholder}
      options={options}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      className={className}
      classNames={{ ...selectClassNames, ...classNames }}
      theme={selectTheme}
      formatOptionLabel={formatOptionLabel}
      components={{ Input: inputType === InputType.TEXT ? Input : NumberInput }}
      required={required}
      autoFocus={autoFocus}
      isClearable={true}
      styles={styles}
    />
  )
}

export default SearchSelect
