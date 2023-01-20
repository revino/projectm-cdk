
import { Construct } from 'constructs';
import { StackProps, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { NetworkListener, NetworkLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { ConnectionType, HttpIntegration, Integration, IntegrationType, RestApi, VpcLink } from 'aws-cdk-lib/aws-apigateway';
import { UserApi } from '../api/UserApi';

export type ApiGatewayProps = {
  vpc: Vpc;
  loadBalancer: NetworkLoadBalancer;
  stackProps?: StackProps
} 

export type ApiProps = {
  loadbalancer: NetworkLoadBalancer,
  api: RestApi,
  vpclink: VpcLink,
  stackProps?: StackProps,
} 

export type makeIntegrationProps = {
  method: string,
  url?: string,
  requestParameters?: {
    [dest: string]: string;
  },
  vpclink: VpcLink,
  loadbalancer: NetworkLoadBalancer,
} 

export class ApiGatewayStack extends Stack{

  public readonly api: RestApi;
  public readonly vpclink: VpcLink;

  constructor(scope: Construct, id: string, props: ApiGatewayProps){
    super(scope, id, props.stackProps);

    const vpc = props.vpc;
    const loadBalancer = props.loadBalancer;

    const vpclinks = new VpcLink(this, 'link', {
      targets: [ loadBalancer ],
    });

    vpclinks.applyRemovalPolicy(RemovalPolicy.DESTROY)

    const restApi = new RestApi(this, 'Endpoint', {
      description: 'projectM api gateway',
      deployOptions: {
        stageName: 'api',
      },
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'AUTH-TOKEN',
        ],
        allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowCredentials: true,
        allowOrigins: ['https://projectm29.netlify.app'],
      },
    });

    restApi.root.addMethod('GET' ,new Integration({
      type: IntegrationType.HTTP_PROXY,
      integrationHttpMethod: 'GET',
      uri: `http://${loadBalancer.loadBalancerDnsName}`,
      options: {
        connectionType: ConnectionType.VPC_LINK,
        vpcLink: vpclinks,
      }
    }))

    restApi.root.addProxy({
      anyMethod:false,
      defaultIntegration: new Integration({
        type: IntegrationType.HTTP_PROXY,
        integrationHttpMethod: 'ANY',
        uri: `http://${loadBalancer.loadBalancerDnsName}/{proxy}`,
        options: {
          connectionType: ConnectionType.VPC_LINK,
          vpcLink: vpclinks,
        }
      })
    }).addMethod('ANY');



    /*
    restApi.root.addProxy({anyMethod: false}).addMethod('ANY', new Integration({
      type: IntegrationType.HTTP_PROXY,
      integrationHttpMethod: 'ANY',
      uri: `http://${loadBalancer.loadBalancerDnsName}/{proxy}`,
      options: {
        connectionType: ConnectionType.VPC_LINK,
        vpcLink: vpclinks,
      },
    }));
    */
    this.api = restApi;
    this.vpclink = vpclinks;
  }

}

export function makeIntegration(props: makeIntegrationProps){
  return new Integration({
    type: IntegrationType.HTTP_PROXY,
    integrationHttpMethod: props.method,
    uri: props.url? `http://${props.loadbalancer.loadBalancerDnsName}/${props.url}` : undefined,
    options: {
      connectionType: ConnectionType.VPC_LINK,
      vpcLink: props.vpclink,
      requestParameters: props.requestParameters,
    },
  })
}