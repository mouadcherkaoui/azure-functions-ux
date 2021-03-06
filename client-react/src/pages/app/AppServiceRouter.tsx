import { Router, RouteComponentProps } from '@reach/router';
import * as React from 'react';
import * as Loadable from 'react-loadable';
import { connect } from 'react-redux';
import LoadingComponent from '../../components/loading/loading-component';
import { updateResourceId } from '../../modules/site/thunks';

export interface AppSeriviceRouterProps {
  subscriptionId?: string;
  siteName?: string;
  slotName?: string;
  resourcegroup?: string;
  updateResourceId: (resourceId: string) => any;
}
const AppSettingsLoadable: any = Loadable({
  loader: () => import('./app-settings/AppSettings'),
  loading: LoadingComponent,
});

export class AppServiceRouter extends React.Component<RouteComponentProps<AppSeriviceRouterProps>, any> {
  public componentWillMount() {
    let resourceId = `/subscriptions/${this.props.subscriptionId}/resourcegroups/${
      this.props.resourcegroup
    }/providers/Microsoft.Web/sites/${this.props.siteName}`;
    if (this.props.slotName) {
      resourceId = `${resourceId}/slots/${this.props.slotName}`;
    }
    this.props.updateResourceId!(resourceId);
  }
  public render() {
    return (
      <main>
        <Router>
          <AppSettingsLoadable path="/settings" />
        </Router>
      </main>
    );
  }
}

const mapDispatchToProps = dispatch => {
  return {
    updateResourceId: resourceId => dispatch(updateResourceId(resourceId)),
  };
};

export default connect(
  null,
  mapDispatchToProps
)(AppServiceRouter);
