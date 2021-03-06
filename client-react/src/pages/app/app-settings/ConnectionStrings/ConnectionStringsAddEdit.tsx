import * as React from 'react';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { Checkbox } from 'office-ui-fabric-react/lib/Checkbox';
import { IConnectionString } from '../../../../modules/site/config/connectionstrings/actions';
import { Dropdown, IDropdownOption } from 'office-ui-fabric-react/lib/Dropdown';
import { translate, InjectedTranslateProps } from 'react-i18next';
import { typeValueToString, DatabaseType } from './connectionStringTypes';
import { formElementStyle } from '../AppSettings.Styles';
import FormActionBar from 'src/components/FormActionBar';
export interface ConnectionStringAddEditProps {
  updateConnectionString: (item: IConnectionString) => any;
  closeBlade: () => void;
  otherConnectionStrings: IConnectionString[];
  connectionString: IConnectionString;
}

const ConnectionStringsAddEdit: React.SFC<ConnectionStringAddEditProps & InjectedTranslateProps> = props => {
  const { updateConnectionString, otherConnectionStrings, t, closeBlade, connectionString } = props;
  const [nameError, setNameError] = React.useState('');
  const [currentConnectionString, setCurrentConnectionString] = React.useState(connectionString);

  const validateConnectionStringName = (value: string) => {
    return otherConnectionStrings.filter(v => v.name === value).length >= 1 ? 'Connection string names must be unique' : '';
  };
  const updateConnectionStringName = (e: any, name: string) => {
    const error = validateConnectionStringName(name);
    setNameError(error);
    setCurrentConnectionString({ ...currentConnectionString, name });
  };

  const updateConnectionStringValue = (e: any, value: string) => {
    setCurrentConnectionString({ ...currentConnectionString, value });
  };

  const updateConnectionStringType = (e: any, typeOption: IDropdownOption) => {
    setCurrentConnectionString({ ...currentConnectionString, type: typeOption.key as number });
  };

  const updateConnectionStringSticky = (e: any, sticky: boolean) => {
    setCurrentConnectionString({ ...currentConnectionString, sticky });
  };

  const save = () => {
    updateConnectionString(currentConnectionString);
  };

  const cancel = () => {
    closeBlade();
  };
  return (
    <form>
      <TextField
        label={t('nameRes')}
        id="connection-strings-form-name"
        value={currentConnectionString.name}
        errorMessage={nameError}
        onChange={updateConnectionStringName}
        styles={{
          root: formElementStyle,
        }}
      />
      <TextField
        label={t('value')}
        id="connection-strings-form-value"
        value={currentConnectionString.value}
        onChange={updateConnectionStringValue}
        styles={{
          root: formElementStyle,
        }}
      />
      <Dropdown
        label={t('type')}
        id="connection-strings-form-type"
        selectedKey={currentConnectionString.type}
        options={[
          {
            key: DatabaseType.MySql,
            text: typeValueToString(DatabaseType.MySql),
          },
          {
            key: DatabaseType.SQLServer,
            text: typeValueToString(DatabaseType.SQLServer),
          },
          {
            key: DatabaseType.SQLAzure,
            text: typeValueToString(DatabaseType.SQLAzure),
          },
        ]}
        onChange={updateConnectionStringType}
        styles={{
          root: formElementStyle,
        }}
      />
      <Checkbox
        label={t('sticky')}
        id="connection-strings-form-sticky"
        defaultChecked={currentConnectionString.sticky}
        onChange={updateConnectionStringSticky}
        styles={{
          root: formElementStyle,
        }}
      />
      <FormActionBar id="connection-string-edit-footer" save={save} valid={!nameError} cancel={cancel} />
    </form>
  );
};

export default translate('translation')(ConnectionStringsAddEdit);
