//#region node_modules/.pnpm/@aws-lite+dynamodb@0.3.9/node_modules/@aws-lite/dynamodb/src/index.mjs
/**
* Plugin maintained by: @architect
*/
var service = "dynamodb";
var property = "DynamoDB";
var required = true;
var docRoot = "https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/";
var devGuide = "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/";
var awsjsonReq = [
	"ExpressionAttributeValues",
	"Item",
	"Key"
];
var awsjsonRes = ["Attributes", "Item"];
var arr = { type: "array" };
var bool = { type: "boolean" };
var obj = { type: "object" };
var str = { type: "string" };
var num = { type: "number" };
var AttributeDefinitions = {
	...arr,
	required,
	comment: "Array of attributes that describe the primary (and sort) schema for the table"
};
var AttributesToGet = {
	...arr,
	comment: "Legacy parameter, use `ProjectionExpression` instead"
};
var BackupArn = {
	...str,
	required,
	comment: "ARN of the specified backup"
};
var BillingMode = {
	...str,
	comment: "Set how the table is charged for read/write throughput: `PROVISIONED`, or `PAY_PER_REQUEST`"
};
var ClientToken = {
	...str,
	comment: "Ensures operation request is idempotent"
};
var ConditionalOperator = {
	...str,
	comment: "Legacy parameter, use `FilterExpression` instead"
};
var ConditionExpression = {
	...str,
	comment: "Condition that must be satisfied in order to complete the operation",
	ref: devGuide + "Expressions.ConditionExpressions.html"
};
var ConsistentRead = {
	...bool,
	comment: "Enable strongly consistent reads; by default eventually consistent reads are used"
};
var DeletionProtectionEnabled = {
	...bool,
	comment: "Enable or disable deletion protection"
};
var ExclusiveStartKey = {
	...obj,
	comment: "Pagination cursor token ARN to be used if `LastEvaluatedKey` was returned in a previous response"
};
var Expected = {
	...obj,
	comment: "Legacy parameter, use `ConditionExpression` instead"
};
var ExpressionAttributeNames = {
	...obj,
	comment: "Substitution tokens for attribute names in an expression",
	ref: devGuide + "Expressions.Attributes.html"
};
var ExpressionAttributeValues = {
	...obj,
	comment: "Values that can be substituted in an expression",
	ref: devGuide + "Expressions.ConditionExpressions.html"
};
var FilterExpression = {
	...str,
	comment: "String of filter conditions applied before data is returned",
	ref: devGuide + "QueryAndScan.html#Query.FilterExpression"
};
var GlobalSecondaryIndexOverride = {
	...arr,
	comment: "List of global secondary indexes for the restored table; included indexes should match existing secondary indexes, although indexes can be excluded"
};
var GlobalTableName = {
	...str,
	required,
	comment: "DynamoDB global table name"
};
var IndexName = {
	...str,
	comment: "DynamoDB global secondary index name (if applicable)"
};
var Key = {
	...obj,
	required,
	comment: "Primary (and sort) key of the item in question"
};
var Limit = {
	...num,
	comment: "Maximum number of items to evaluate and return"
};
var LocalSecondaryIndexOverride = {
	...arr,
	comment: "List of local secondary indexes for the restored table; included indexes should match existing secondary indexes, although indexes can be excluded"
};
var NextToken = {
	...str,
	comment: "Pagination cursor token to be used if `NextToken` was returned in a previous response"
};
var ProjectionExpression = {
	...str,
	comment: "Comma separated string that identifies one or more attributes to retrieve from the table"
};
var ProvisionedThroughput = {
	...obj,
	comment: "Provisioned throughput setting"
};
var ReturnConsumedCapacity = {
	...str,
	comment: "Return throughput consumption in response, can be set to one of: `INDEXES`, `TOTAL`, or `NONE`"
};
var ReturnItemCollectionMetrics = {
	...str,
	comment: "Return collection metrics in response, can be set to: `SIZE`, or `NONE` (default)"
};
var ReturnValues = {
	...str,
	comment: "Return the item as it was prior to the operation taking place, can be set to `NONE` (default), or `ALL_OLD`"
};
var ReturnValuesOnConditionCheckFailure = {
	...str,
	comment: "Return the item attributes that failed  a condition check, can be set to `NONE`, or `ALL_OLD`"
};
var SSESpecification = {
	...obj,
	comment: "Server-side encryption settings"
};
var StreamArn = {
	...str,
	required,
	comment: "ARN of the specified Kinesis data stream"
};
var StreamSpecification = {
	...obj,
	comment: "Settings for Streams, including: `StreamEnabled` (boolean), and `StreamViewType` (`KEYS_ONLY`, `NEW_IMAGE`, `OLD_IMAGE`, or `NEW_AND_OLD_IMAGES`)"
};
var TableClass = {
	...str,
	comment: "Class of the table, can be set to: `STANDARD`, or `STANDARD_INFREQUENT_ACCESS`"
};
var TableName = {
	...str,
	required,
	comment: "DynamoDB table name"
};
var TargetTableName = {
	...str,
	required,
	comment: "Name of the new table into which the backup will be restored"
};
var valPaginate = {
	type: ["boolean", "string"],
	comment: "Enable automatic result pagination; use this instead of making your own individual pagination requests"
};
var defaultResponse = ({ payload }) => payload;
var defaultError = (params) => {
	if (params?.error?.__type) {
		const name = params.error.__type.split("#")[1];
		if (name) params.error.name = params.error.code = name;
	}
	return params;
};
var unmarshall = (keys) => ({ payload }) => ({
	awsjson: keys,
	...payload
});
var headers = (method, additional) => ({
	"X-Amz-Target": `DynamoDB_20120810.${method}`,
	...additional
});
var awsjsonContentType = { "content-type": "application/x-amz-json-1.0" };
var paginator = {
	cursor: "ExclusiveStartKey",
	token: "LastEvaluatedKey",
	accumulator: "Items"
};
var src_default = {
	name: "@aws-lite/dynamodb",
	service,
	property,
	methods: {
		BatchExecuteStatement: {
			awsDoc: docRoot + "API_BatchExecuteStatement.html",
			validate: {
				Statements: {
					...arr,
					required,
					comment: "Array of PartiQL statements representing the batch being run"
				},
				ReturnConsumedCapacity
			},
			request: async (params, { awsjsonMarshall, config }) => {
				let Statements = params.Statements?.map((s) => {
					let Parameters = s?.Parameters?.map((p) => awsjsonMarshall(p, { config }));
					return {
						...s,
						Parameters
					};
				});
				return {
					awsjson: false,
					headers: headers("BatchExecuteStatement", awsjsonContentType),
					payload: {
						...params,
						Statements
					}
				};
			},
			response: async ({ payload }, { awsjsonUnmarshall, config }) => {
				if (payload?.Responses?.length) payload.Responses = payload.Responses.map((r) => {
					if (r?.Error?.Item) r.Error.Item = awsjsonUnmarshall(r.Error.Item, { config });
					if (r?.Item) r.Item = awsjsonUnmarshall(r.Item, { config });
					return r;
				});
				return payload;
			},
			error: defaultError
		},
		BatchGetItem: {
			awsDoc: docRoot + "API_BatchGetItem.html",
			validate: {
				RequestItems: {
					...obj,
					required,
					comment: "An object containing >=1 table names and, for each table, an object describing >=1 items to get"
				},
				ReturnConsumedCapacity
			},
			request: async (params, { awsjsonMarshall, config }) => {
				let RequestItems = {};
				Object.entries(params.RequestItems).forEach(([table, item]) => {
					RequestItems[table] = item;
					RequestItems[table].Keys = item?.Keys?.map((k) => awsjsonMarshall(k, { config }));
				});
				return {
					awsjson: false,
					headers: headers("BatchGetItem", awsjsonContentType),
					payload: {
						...params,
						RequestItems
					}
				};
			},
			response: async ({ payload }, { awsjsonUnmarshall, config }) => {
				let Responses = Object.keys(payload.Responses);
				if (Responses.length) Responses.forEach((i) => payload.Responses[i] = payload.Responses[i]?.map((r) => awsjsonUnmarshall(r, { config })));
				let UnprocessedKeys = Object.keys(payload.UnprocessedKeys);
				if (UnprocessedKeys.length) UnprocessedKeys.forEach((i) => payload.UnprocessedKeys[i] = {
					...payload.UnprocessedKeys[i],
					Keys: payload.UnprocessedKeys[i]?.Keys?.map((k) => awsjsonUnmarshall(k, { config }))
				});
				return payload;
			},
			error: defaultError
		},
		BatchWriteItem: {
			awsDoc: docRoot + "API_BatchWriteItem.html",
			validate: {
				RequestItems: {
					...obj,
					required,
					comment: "An object containing >=1 table names and, for each table, an object describing >=1 items to write"
				},
				ReturnConsumedCapacity,
				ReturnItemCollectionMetrics
			},
			request: async (params, { awsjsonMarshall, config }) => {
				let RequestItems = {};
				Object.entries(params.RequestItems).forEach(([table, items]) => {
					RequestItems[table] = items.map((i) => {
						let request = {};
						Object.entries(i).forEach(([op, data]) => {
							if (op === "DeleteRequest") request[op] = { Key: awsjsonMarshall(data.Key, { config }) };
							if (op === "PutRequest") request[op] = { Item: awsjsonMarshall(data.Item, { config }) };
						});
						return request;
					});
				});
				return {
					awsjson: false,
					headers: headers("BatchWriteItem", awsjsonContentType),
					payload: {
						...params,
						RequestItems
					}
				};
			},
			response: async ({ payload }, { awsjsonUnmarshall, config }) => {
				let UnprocessedItems = {};
				Object.entries(payload.UnprocessedItems).forEach(([table, items]) => {
					UnprocessedItems[table] = items.map((i) => {
						let request = {};
						Object.entries(i).forEach(([op, data]) => {
							if (op === "DeleteRequest") request[op] = { Key: awsjsonUnmarshall(data.Key, { config }) };
							if (op === "PutRequest") request[op] = { Item: awsjsonUnmarshall(data.Item, { config }) };
						});
						return request;
					});
				});
				return {
					...payload,
					UnprocessedItems
				};
			},
			error: defaultError
		},
		CreateBackup: {
			awsDoc: docRoot + "API_CreateBackup.html",
			validate: {
				TableName,
				BackupName: {
					...str,
					required,
					comment: "Specified name of the backup"
				}
			},
			request: async (params) => ({
				headers: headers("CreateBackup"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		CreateGlobalTable: {
			awsDoc: docRoot + "API_CreateGlobalTable.html",
			validate: {
				GlobalTableName: TableName,
				ReplicationGroup: {
					...arr,
					required,
					comment: "AWS regions where the global table needs to be created"
				}
			},
			request: async (params) => ({
				headers: headers("CreateGlobalTable"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		CreateTable: {
			awsDoc: docRoot + "API_CreateTable.html",
			validate: {
				TableName,
				AttributeDefinitions,
				KeySchema: {
					...arr,
					required,
					comment: "Attributes that make up the primary key for a table or index. The attributes in `KeySchema` must also be defined in the `AttributeDefinitions` array"
				},
				BillingMode,
				DeletionProtectionEnabled,
				GlobalSecondaryIndexes: {
					...arr,
					comment: "1-20 global secondary indexes to be created on the table",
					ref: docRoot + "API_CreateTable.html#DDB-CreateTable-request-GlobalSecondaryIndexes"
				},
				LocalSecondaryIndexes: {
					...arr,
					comment: "1-5 local secondary indexes to be created on the table",
					ref: docRoot + "API_CreateTable.html#DDB-CreateTable-request-LocalSecondaryIndexes"
				},
				ProvisionedThroughput,
				SSESpecification,
				StreamSpecification,
				TableClass,
				Tags: {
					...arr,
					comment: "Array of pairs to label the table"
				}
			},
			request: async (params) => ({
				headers: headers("CreateTable"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DeleteBackup: {
			awsDoc: docRoot + "API_DeleteBackup.html",
			validate: { BackupArn },
			request: async (params) => ({
				headers: headers("DeleteBackup"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DeleteItem: {
			awsDoc: docRoot + "API_DeleteItem.html",
			validate: {
				TableName,
				Key,
				ConditionalOperator,
				ConditionExpression,
				Expected,
				ExpressionAttributeNames,
				ExpressionAttributeValues,
				ReturnConsumedCapacity,
				ReturnItemCollectionMetrics,
				ReturnValues,
				ReturnValuesOnConditionCheckFailure
			},
			request: async (params) => ({
				awsjson: awsjsonReq,
				headers: headers("DeleteItem"),
				payload: params
			}),
			response: async ({ payload }, { awsjsonUnmarshall, config }) => {
				if (payload?.Attributes) payload.Attributes = awsjsonUnmarshall(payload.Attributes, { config });
				return payload;
			},
			error: defaultError
		},
		DeleteTable: {
			awsDoc: docRoot + "API_DeleteTable.html",
			validate: { TableName },
			request: async (params) => ({
				headers: headers("DeleteTable"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DescribeBackup: {
			awsDoc: docRoot + "API_DescribeBackup.html",
			validate: { BackupArn },
			request: async (params) => ({
				headers: headers("DescribeBackup"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DescribeContinuousBackups: {
			awsDoc: docRoot + "API_DescribeContinuousBackups.html",
			validate: { TableName },
			request: async (params) => ({
				headers: headers("DescribeContinuousBackups"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DescribeContributorInsights: {
			awsDoc: docRoot + "API_DescribeContributorInsights.html",
			validate: {
				TableName,
				IndexName
			},
			request: async (params) => ({
				headers: headers("DescribeContributorInsights"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DescribeEndpoints: {
			awsDoc: docRoot + "API_DescribeEndpoints.html",
			validate: {},
			request: async () => ({ headers: headers("DescribeEndpoints") }),
			response: defaultResponse,
			error: defaultError
		},
		DescribeExport: {
			awsDoc: docRoot + "API_DescribeExport.html",
			validate: { ExportArn: {
				...str,
				required,
				comment: "ARN of the specified export"
			} },
			request: async (params) => ({
				headers: headers("DescribeExport"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DescribeGlobalTable: {
			awsDoc: docRoot + "API_DescribeGlobalTable.html",
			validate: { GlobalTableName },
			request: async (params) => ({
				headers: headers("DescribeGlobalTable"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DescribeGlobalTableSettings: {
			awsDoc: docRoot + "API_DescribeGlobalTableSettings.html",
			validate: { GlobalTableName },
			request: async (params) => ({
				headers: headers("DescribeGlobalTableSettings"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DescribeImport: {
			awsDoc: docRoot + "API_DescribeImport.html",
			validate: { ImportArn: {
				...str,
				required,
				comment: "ARN of the specified import"
			} },
			request: async (params) => ({
				headers: headers("DescribeImport"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DescribeKinesisStreamingDestination: {
			awsDoc: docRoot + "API_DescribeKinesisStreamingDestination.html",
			validate: { TableName },
			request: async (params) => ({
				headers: headers("DescribeKinesisStreamingDestination"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DescribeLimits: {
			awsDoc: docRoot + "API_DescribeLimits.html",
			validate: {},
			request: async () => ({ headers: headers("DescribeLimits") }),
			response: defaultResponse,
			error: defaultError
		},
		DescribeTable: {
			awsDoc: docRoot + "API_DescribeTable.html",
			validate: { TableName },
			request: async (params) => ({
				headers: headers("DescribeTable"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DescribeTableReplicaAutoScaling: {
			awsDoc: docRoot + "API_DescribeTableReplicaAutoScaling.html",
			validate: { TableName },
			request: async (params) => ({
				headers: headers("DescribeTableReplicaAutoScaling"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DescribeTimeToLive: {
			awsDoc: docRoot + "API_DescribeTimeToLive.html",
			validate: { TableName },
			request: async (params) => ({
				headers: headers("DescribeTimeToLive"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		DisableKinesisStreamingDestination: {
			awsDoc: docRoot + "API_DisableKinesisStreamingDestination.html",
			validate: {
				TableName,
				StreamArn
			},
			request: async (params) => ({
				headers: headers("DisableKinesisStreamingDestination"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		EnableKinesisStreamingDestination: {
			awsDoc: docRoot + "API_EnableKinesisStreamingDestination.html",
			validate: {
				TableName,
				StreamArn
			},
			request: async (params) => ({
				headers: headers("EnableKinesisStreamingDestination"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		ExecuteStatement: {
			awsDoc: docRoot + "API_ExecuteStatement.html",
			validate: {
				TableName,
				Statement: {
					...str,
					required,
					comment: "PartiQL statement representing the operation to run"
				},
				ConsistentRead,
				Limit,
				NextToken,
				Parameters: {
					...arr,
					comment: "PartiQL statement parameters, if any"
				},
				ReturnConsumedCapacity,
				ReturnValuesOnConditionCheckFailure
			},
			request: async (params, { awsjsonMarshall, config }) => {
				if (params.Parameters) params.Parameters = params.Parameters.map((p) => awsjsonMarshall(p, { config }));
				return {
					headers: headers("ExecuteStatement"),
					payload: params
				};
			},
			response: async ({ payload }, { awsjsonUnmarshall, config }) => {
				if (payload?.Items?.length) payload.Items = payload.Items.map((i) => awsjsonUnmarshall(i, { config }));
				payload.awsjson = ["LastEvaluatedKey"];
				return payload;
			},
			error: defaultError
		},
		ExecuteTransaction: {
			awsDoc: docRoot + "API_ExecuteTransaction.html",
			validate: {
				TableName,
				TransactStatements: {
					...arr,
					required,
					comment: "PartiQL statement parameters representing the transaction to run"
				},
				ClientRequestToken: NextToken,
				ReturnConsumedCapacity
			},
			request: async (params, { awsjsonMarshall, config }) => {
				if (params.TransactStatements) params.TransactStatements = params.TransactStatements.map((i) => {
					if (i.Parameters) i.Parameters = i.Parameters.map((p) => awsjsonMarshall(p, { config }));
					return i;
				});
				return {
					headers: headers("ExecuteTransaction"),
					payload: params
				};
			},
			response: async ({ payload }, { awsjsonUnmarshall, config }) => {
				if (payload?.Responses?.length) payload.Responses = payload.Responses.map((i) => {
					i.Item = awsjsonUnmarshall(i.Item, { config });
					return i;
				});
				return payload;
			},
			error: defaultError
		},
		ExportTableToPointInTime: {
			awsDoc: docRoot + "API_ExportTableToPointInTime.html",
			validate: {
				S3Bucket: {
					...str,
					required,
					comment: "Destination S3 bucket of the snapshot export"
				},
				TableArn: {
					...str,
					required,
					comment: "ARN of the table being exported"
				},
				ClientToken,
				ExportFormat: {
					...str,
					comment: "Format for the exported data, can be set to: `DYNAMODB_JSON`, or `IO`"
				},
				ExportTime: {
					...num,
					comment: "Point in time (in epoch seconds) from which to export table data"
				},
				S3BucketOwner: {
					...str,
					comment: "AWS account ID that owns the destination S3 bucket"
				},
				S3Prefix: {
					...str,
					comment: "S3 bucket prefix to use as the file name and path of the exported snapshot"
				},
				S3SseAlgorithm: {
					...str,
					comment: "Type of encryption used on the bucket where export data will be stored, can be set to `AES256`, or `KMS`"
				},
				S3SseKmsKeyId: {
					...str,
					comment: "AWS KMS managed key ID used to encrypt the destination S3 bucket (if applicable)"
				}
			},
			request: async (params) => ({
				headers: headers("ExportTableToPointInTime"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		GetItem: {
			awsDoc: docRoot + "API_GetItem.html",
			validate: {
				TableName,
				Key,
				AttributesToGet,
				ConsistentRead,
				ExpressionAttributeNames,
				ProjectionExpression,
				ReturnConsumedCapacity
			},
			request: async (params) => ({
				awsjson: awsjsonReq,
				headers: headers("GetItem"),
				payload: params
			}),
			response: unmarshall(awsjsonRes),
			error: defaultError
		},
		ImportTable: {
			awsDoc: docRoot + "API_ImportTable.html",
			validate: {
				InputFormat: {
					...str,
					required,
					comment: "Source data format, can be set to: `CSV`, `DYNAMODB_JSON`, or `ION`"
				},
				S3BucketSource: {
					...obj,
					required,
					comment: "Destination S3 bucket of the snapshot import"
				},
				TableCreationParameters: {
					...obj,
					required,
					comment: "Parameters for the table to import the data",
					ref: docRoot + "API_TableCreationParameters.html"
				},
				ClientToken,
				InputCompressionType: {
					...str,
					comment: "Input compression type, can be set to: `GZIP`, `ZSTD`, or `NONE`"
				},
				InputFormatOptions: {
					...obj,
					comment: "Additional input formatting options"
				}
			},
			request: async (params) => ({
				headers: headers("ImportTable"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		ListBackups: {
			awsDoc: docRoot + "API_ListBackups.html",
			validate: {
				BackupType: {
					...str,
					comment: "Limit backups by type, can be set to: `USER` `SYSTEM`, `AWS_BACKUP`, or `ALL`"
				},
				ExclusiveStartBackupArn: {
					...str,
					comment: "Pagination cursor token ARN to be used if `LastEvaluatedBackupArn` was returned in a previous response"
				},
				Limit,
				TableName: {
					...str,
					comment: "List backups by DynamoDB table name"
				},
				TimeRangeLowerBound: {
					...num,
					comment: "Inclusively return backups created after this time"
				},
				TimeRangeUpperBound: {
					...num,
					comment: "Exclusively return backups created before this time"
				},
				paginate: valPaginate
			},
			request: async (params) => {
				const payload = { ...params };
				const { paginate } = params;
				if (paginate) delete payload.paginate;
				return {
					headers: headers("ListBackups"),
					paginate,
					paginator: {
						cursor: "ExclusiveStartBackupArn",
						token: "LastEvaluatedBackupArn",
						accumulator: "BackupSummaries"
					},
					payload
				};
			},
			response: defaultResponse,
			error: defaultError
		},
		ListContributorInsights: {
			awsDoc: docRoot + "API_ListContributorInsights.html",
			validate: {
				MaxResults: Limit,
				NextToken,
				TableName: {
					...TableName,
					required: false
				}
			},
			request: async (params) => ({
				headers: headers("ListContributorInsights"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		ListExports: {
			awsDoc: docRoot + "API_ListExports.html",
			validate: {
				MaxResults: Limit,
				NextToken,
				TableArn: {
					...str,
					comment: "ARN of the exported table"
				}
			},
			request: async (params) => ({
				headers: headers("ListExports"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		ListGlobalTables: {
			awsDoc: docRoot + "API_ListGlobalTables.html",
			validate: {
				ExclusiveStartGlobalTableName: {
					...str,
					comment: "Pagination cursor token to be used if `LastEvaluatedGlobalTableName` was returned in a previous response"
				},
				Limit,
				RegionName: {
					...str,
					comment: "List the global tables in a specific region"
				}
			},
			request: async (params) => ({
				headers: headers("ListGlobalTables"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		ListImports: {
			awsDoc: docRoot + "API_ListImports.html",
			validate: {
				NextToken,
				PageSize: Limit,
				TableArn: {
					...str,
					comment: "ARN of the table imported to"
				}
			},
			request: async (params) => ({
				headers: headers("ListImports"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		ListTables: {
			awsDoc: docRoot + "API_ListTables.html",
			validate: {
				ExclusiveStartTableName: {
					...str,
					comment: "Pagination cursor token to be used if `LastEvaluatedTableName` was returned in a previous response"
				},
				Limit
			},
			request: async (params) => ({
				headers: headers("ListTables"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		ListTagsOfResource: {
			awsDoc: docRoot + "API_ListTagsOfResource.html",
			validate: {
				NextToken,
				ResourceArn: {
					...str,
					required,
					comment: "Resource tags to be returned"
				}
			},
			request: async (params) => ({
				headers: headers("ListTagsOfResource"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		PutItem: {
			awsDoc: docRoot + "API_PutItem.html",
			validate: {
				TableName,
				Item: {
					...obj,
					required,
					comment: "Item to be written to DynamoDB"
				},
				ConditionalOperator,
				ConditionExpression,
				Expected,
				ExpressionAttributeNames,
				ExpressionAttributeValues,
				ReturnConsumedCapacity,
				ReturnItemCollectionMetrics,
				ReturnValues,
				ReturnValuesOnConditionCheckFailure
			},
			request: async (params) => ({
				awsjson: awsjsonReq,
				headers: headers("PutItem"),
				payload: params
			}),
			response: unmarshall(["Attributes"]),
			error: defaultError
		},
		Query: {
			awsDoc: docRoot + "API_Query.html",
			validate: {
				TableName,
				AttributesToGet,
				ConditionalOperator,
				ConsistentRead,
				ExclusiveStartKey,
				ExpressionAttributeNames,
				ExpressionAttributeValues,
				FilterExpression,
				IndexName,
				KeyConditionExpression: {
					...str,
					comment: "Condition specifying the key values for items to be retrieved; the condition must perform an equality test on a single partition key value",
					ref: docRoot + "API_Query.html#DDB-Query-request-KeyConditionExpression"
				},
				KeyConditions: {
					...obj,
					comment: "Legacy parameter, use `KeyConditionExpression` instead"
				},
				Limit,
				ProjectionExpression,
				QueryFilter: {
					...obj,
					comment: "Legacy parameter, use `FilterExpression` instead"
				},
				ReturnConsumedCapacity,
				ScanIndexForward: {
					...bool,
					comment: "Index traversal order: `true` (default) for ascending, `false` for descending order"
				},
				Select: {
					...str,
					comment: "Attributes to be returned in the result, can be set to: `ALL_ATTRIBUTES`, `ALL_PROJECTED_ATTRIBUTES`, `COUNT`, or `SPECIFIC_ATTRIBUTES`",
					ref: docRoot + "API_Query.html#DDB-Query-request-Select"
				},
				paginate: valPaginate
			},
			request: async (params) => {
				const payload = { ...params };
				const { paginate } = params;
				if (paginate) delete payload.paginate;
				return {
					awsjson: awsjsonReq,
					headers: headers("Query"),
					paginate,
					paginator,
					payload
				};
			},
			response: async ({ payload }, { awsjsonUnmarshall, config }) => {
				if (payload?.Items?.length) payload.Items = payload.Items.map((i) => awsjsonUnmarshall(i, { config }));
				return payload;
			},
			error: defaultError
		},
		RestoreTableFromBackup: {
			awsDoc: docRoot + "API_RestoreTableFromBackup.html",
			validate: {
				BackupArn,
				TargetTableName,
				BillingModeOverride: BillingMode,
				GlobalSecondaryIndexOverride,
				LocalSecondaryIndexOverride,
				ProvisionedThroughputOverride: ProvisionedThroughput,
				SSESpecificationOverride: SSESpecification
			},
			request: async (params) => ({
				headers: headers("RestoreTableFromBackup"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		RestoreTableToPointInTime: {
			awsDoc: docRoot + "API_RestoreTableToPointInTime.html",
			validate: {
				TargetTableName,
				BillingModeOverride: BillingMode,
				GlobalSecondaryIndexOverride,
				LocalSecondaryIndexOverride,
				ProvisionedThroughputOverride: ProvisionedThroughput,
				RestoreDateTime: {
					...num,
					comment: "Past time to restore the table to"
				},
				SourceTableArn: {
					...BackupArn,
					required: false
				},
				SourceTableName: {
					...str,
					comment: "Name of the source table being restored"
				},
				SSESpecificationOverride: SSESpecification,
				UseLatestRestorableTime: {
					...bool,
					comment: "Restore to the latest possible time; typically 5 minutes before the current time"
				}
			},
			request: async (params) => ({
				headers: headers("RestoreTableToPointInTime"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		Scan: {
			awsDoc: docRoot + "API_Scan.html",
			validate: {
				TableName,
				AttributesToGet,
				ConditionalOperator,
				ConsistentRead,
				ExclusiveStartKey,
				ExpressionAttributeNames,
				ExpressionAttributeValues,
				FilterExpression,
				IndexName,
				Limit,
				ProjectionExpression,
				ReturnConsumedCapacity,
				ScanFilter: {
					...obj,
					comment: "Legacy parameter, use `FilterExpression` instead"
				},
				Segment: {
					...num,
					comment: "Individual segment to be scanned in a parallel `Scan` request",
					ref: docRoot + "API_Scan.html#DDB-Scan-request-ScanFilter"
				},
				Select: {
					...str,
					comment: "Attributes to be returned in the result, can be set to: `ALL_ATTRIBUTES`, `ALL_PROJECTED_ATTRIBUTES`, `COUNT`, or `SPECIFIC_ATTRIBUTES`",
					ref: docRoot + "API_Scan.html#DDB-Scan-request-Select"
				},
				TotalSegments: {
					...num,
					comment: "Total number of segments to be scanned in a parallel `Scan` request",
					ref: docRoot + "API_Scan.html#DDB-Scan-request-ScanFilter"
				},
				paginate: valPaginate
			},
			request: async (params) => {
				const payload = { ...params };
				const { paginate } = params;
				if (paginate) delete payload.paginate;
				return {
					awsjson: awsjsonReq,
					headers: headers("Scan"),
					payload,
					paginate,
					paginator
				};
			},
			response: async ({ payload }, { awsjsonUnmarshall, config }) => {
				if (payload?.Items?.length) payload.Items = payload.Items.map((i) => awsjsonUnmarshall(i, { config }));
				return payload;
			},
			error: defaultError
		},
		TagResource: {
			awsDoc: docRoot + "API_TagResource.html",
			validate: {
				ResourceArn: {
					...str,
					required,
					comment: "Resource to add tags to"
				},
				Tags: {
					...arr,
					required,
					comment: "Tags to be assigned"
				}
			},
			request: async (params) => ({
				headers: headers("TagResource"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		TransactGetItems: {
			awsDoc: docRoot + "API_TransactGetItems.html",
			validate: {
				TransactItems: {
					...arr,
					required,
					comment: "Ordered array of up to 100 `TransactGetItem` objects, each of which containing a `Get` object",
					ref: docRoot + "API_TransactGetItems.html#DDB-TransactGetItems-request-TransactItems"
				},
				ReturnConsumedCapacity
			},
			request: async (params, { awsjsonMarshall, config }) => {
				params.TransactItems = params.TransactItems.map((i) => {
					if (i.Get.Key) i.Get.Key = awsjsonMarshall(i.Get.Key, { config });
					return i;
				});
				return {
					headers: headers("TransactGetItems"),
					payload: params
				};
			},
			response: async ({ payload }, { awsjsonUnmarshall, config }) => {
				if (payload?.Responses?.length) payload.Responses = payload.Responses.map((i) => {
					i.Item = awsjsonUnmarshall(i.Item, { config });
					return i;
				});
				return payload;
			},
			error: defaultError
		},
		TransactWriteItems: {
			awsDoc: docRoot + "API_TransactWriteItems.html",
			validate: {
				TransactItems: {
					...arr,
					required,
					comment: "Ordered array of up to 100 `TransactWriteItem` objects, each of which containing a `ConditionCheck`, `Put`, `Update`, or `Delete` object",
					ref: docRoot + "API_TransactWriteItems.html#DDB-TransactWriteItems-request-TransactItems"
				},
				ClientRequestToken: ClientToken,
				ReturnConsumedCapacity,
				ReturnItemCollectionMetrics
			},
			request: async (params, { awsjsonMarshall, config }) => {
				params.TransactItems = params.TransactItems.map((i) => {
					if (i.ConditionCheck) {
						if (i.ConditionCheck.ExpressionAttributeValues) i.ConditionCheck.ExpressionAttributeValues = awsjsonMarshall(i.ConditionCheck.ExpressionAttributeValues, { config });
						if (i.ConditionCheck.Key) i.ConditionCheck.Key = awsjsonMarshall(i.ConditionCheck.Key, { config });
					} else if (i.Delete) {
						if (i.Delete.ExpressionAttributeValues) i.Delete.ExpressionAttributeValues = awsjsonMarshall(i.Delete.ExpressionAttributeValues, { config });
						if (i.Delete.Key) i.Delete.Key = awsjsonMarshall(i.Delete.Key, { config });
					} else if (i.Put) {
						if (i.Put.ExpressionAttributeValues) i.Put.ExpressionAttributeValues = awsjsonMarshall(i.Put.ExpressionAttributeValues, { config });
						if (i.Put.Item) i.Put.Item = awsjsonMarshall(i.Put.Item, { config });
					} else if (i.Update) {
						if (i.Update.ExpressionAttributeValues) i.Update.ExpressionAttributeValues = awsjsonMarshall(i.Update.ExpressionAttributeValues, { config });
						if (i.Update.Key) i.Update.Key = awsjsonMarshall(i.Update.Key, { config });
					}
					return i;
				});
				return {
					headers: headers("TransactWriteItems"),
					payload: params
				};
			},
			response: async ({ payload }, { awsjsonUnmarshall, config }) => {
				if (Object.keys(payload?.ItemCollectionMetrics || {})?.length) Object.entries(payload.ItemCollectionMetrics).forEach(([table, items]) => {
					payload.ItemCollectionMetrics[table] = items.map((i) => {
						i.ItemCollectionKey = awsjsonUnmarshall(i.ItemCollectionKey, { config });
					});
				});
				return payload;
			},
			error: defaultError
		},
		UntagResource: {
			awsDoc: docRoot + "API_UntagResource.html",
			validate: {
				ResourceArn: {
					...str,
					required,
					comment: "Resource to remove tags from"
				},
				TagKeys: {
					...arr,
					required,
					comment: "Tags to be removed"
				}
			},
			request: async (params) => ({
				headers: headers("UntagResource"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		UpdateContinuousBackups: {
			awsDoc: docRoot + "API_UpdateContinuousBackups.html",
			validate: {
				TableName,
				PointInTimeRecoverySpecification: {
					...obj,
					comment: "Point in time recovery settings",
					ref: docRoot + "API_PointInTimeRecoverySpecification.html"
				}
			},
			request: async (params) => ({
				headers: headers("UpdateContinuousBackups"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		UpdateContributorInsights: {
			awsDoc: docRoot + "API_UpdateContributorInsights.html",
			validate: {
				TableName,
				ContributorInsightsAction: {
					...str,
					comment: "Contributor insights action, can be set to: `ENABLE` or `DISABLE`"
				},
				IndexName
			},
			request: async (params) => ({
				headers: headers("UpdateContributorInsights"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		UpdateGlobalTable: {
			awsDoc: docRoot + "API_UpdateGlobalTable.html",
			validate: {
				GlobalTableName,
				ReplicaUpdates: {
					...arr,
					comment: "List of regions to be added or removed from the global table"
				}
			},
			request: async (params) => ({
				headers: headers("UpdateGlobalTable"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		UpdateGlobalTableSettings: {
			awsDoc: docRoot + "API_UpdateGlobalTableSettings.html",
			validate: {
				GlobalTableName,
				GlobalTableBillingMode: BillingMode,
				GlobalTableGlobalSecondaryIndexSettingsUpdate: {
					...arr,
					comment: "1-20 global secondary indexes to be modified",
					ref: docRoot + "API_GlobalTableGlobalSecondaryIndexSettingsUpdate.html"
				},
				GlobalTableProvisionedWriteCapacityAutoScalingSettingsUpdate: {
					...obj,
					comment: "Auto-scaling settings for managing provisioned write capacity",
					ref: docRoot + "API_AutoScalingSettingsUpdate.html"
				},
				GlobalTableProvisionedWriteCapacityUnits: {
					...num,
					comment: "Maximum number of writes per second before returning a `ThrottlingException`"
				},
				ReplicaSettingsUpdate: {
					...arr,
					comment: "Global table settings to be modified",
					ref: docRoot + "API_ReplicaSettingsUpdate.html"
				}
			},
			request: async (params) => ({
				headers: headers("UpdateGlobalTableSettings"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		UpdateItem: {
			awsDoc: docRoot + "API_UpdateItem.html",
			validate: {
				Key,
				TableName,
				AttributeUpdates: {
					...obj,
					comment: "Legacy parameter, use `UpdateExpression` instead"
				},
				ConditionalOperator: {
					...str,
					comment: "Legacy parameter, use `ConditionExpression` instead"
				},
				ConditionExpression,
				Expected,
				ExpressionAttributeNames,
				ExpressionAttributeValues,
				ReturnConsumedCapacity,
				ReturnItemCollectionMetrics,
				ReturnValues: {
					...str,
					comment: "Return the item as it was prior to the operation taking place, can be set to `NONE` (default), `ALL_OLD`, `UPDATED_OLD`, `ALL_NEW`, `UPDATED_NEW`"
				},
				ReturnValuesOnConditionCheckFailure,
				UpdateExpression: {
					...str,
					comment: "Expression that defines attributes to be updated, the action to be performed on each, and their new values",
					ref: docRoot + "API_UpdateItem.html#DDB-UpdateItem-request-UpdateExpression"
				}
			},
			request: async (params) => ({
				awsjson: awsjsonReq,
				headers: headers("UpdateItem"),
				payload: params
			}),
			response: async ({ payload }, { awsjsonUnmarshall, config }) => {
				if (Object.keys(payload?.ItemCollectionMetrics || {})?.length) Object.entries(payload.ItemCollectionMetrics.ItemCollectionKey).forEach(([key, props]) => {
					payload.ItemCollectionMetrics.ItemCollectionKey[key] = awsjsonUnmarshall(props, { config });
				});
				payload.awsjson = awsjsonRes;
				return payload;
			},
			error: defaultError
		},
		UpdateTable: {
			awsDoc: docRoot + "API_UpdateTable.html",
			validate: {
				TableName,
				AttributeDefinitions: {
					...AttributeDefinitions,
					required: false
				},
				BillingMode,
				DeletionProtectionEnabled,
				GlobalSecondaryIndexUpdates: {
					...arr,
					comment: "Global secondary index updates, each of which may be: `Create`, `Update`, or `Delete`",
					ref: docRoot + "API_GlobalSecondaryIndexUpdate.html"
				},
				ProvisionedThroughput,
				ReplicaUpdates: {
					...arr,
					comment: "Table replica updates, each of which may be: `Create`, `Update`, or `Delete`",
					ref: docRoot + "API_ReplicationGroupUpdate.html"
				},
				SSESpecification,
				StreamSpecification,
				TableClass
			},
			request: async (params) => ({
				headers: headers("UpdateTable"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		UpdateTableReplicaAutoScaling: {
			awsDoc: docRoot + "API_UpdateTableReplicaAutoScaling.html",
			validate: {
				TableName,
				GlobalSecondaryIndexUpdates: {
					...arr,
					comment: "Auto-scaling settings of the global secondary indexes of the replica",
					ref: docRoot + "API_GlobalSecondaryIndexAutoScalingUpdate.html"
				},
				ProvisionedWriteCapacityAutoScalingUpdate: {
					...obj,
					comment: "Auto-scaling settings for a global table or global secondary index",
					ref: docRoot + "API_AutoScalingSettingsUpdate.html"
				},
				ReplicaUpdates: {
					...arr,
					comment: "Auto=scaling settings of table replicas",
					ref: docRoot + "API_ReplicaAutoScalingUpdate.html"
				}
			},
			request: async (params) => ({
				headers: headers("UpdateTableReplicaAutoScaling"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		},
		UpdateTimeToLive: {
			awsDoc: docRoot + "API_UpdateTimeToLive.html",
			validate: {
				TableName,
				TimeToLiveSpecification: {
					...obj,
					comment: "TTL settings for the specified table"
				}
			},
			request: async (params) => ({
				headers: headers("UpdateTimeToLive"),
				payload: params
			}),
			response: defaultResponse,
			error: defaultError
		}
	}
};
//#endregion
export { src_default as default };

//# sourceMappingURL=src-CYZbDugx.js.map