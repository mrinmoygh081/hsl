exports.LatestRecordQueryBuilder = ({
    tableName,
    groupByColumn,
    timestampColumn = "created_at",

    selectColumns = ["lr.*"],

    joins = [],

    filters = [],

    pageNo = 1,
    pageSize = 10,

    orderBy = null
}) => {

    let paramCount = 0;

    const values = [];

    //--------------------------------------------------
    // Build Single Filter
    //--------------------------------------------------

    const buildFilter = (filter) => {

        const column = filter.column;

        if (!column) {
            throw new Error("column is required");
        }

        const operator = (
            filter.operator || "="
        ).toUpperCase();

        switch (operator) {

            case "=":
            case "!=":
            case ">":
            case "<":
            case ">=":
            case "<=":

                values.push(filter.value);

                return `${column} ${operator} $${++paramCount}`;

            case "ILIKE":

                values.push(`%${filter.value}%`);

                return `${column} ILIKE $${++paramCount}`;

            case "LIKE":

                values.push(`%${filter.value}%`);

                return `${column} LIKE $${++paramCount}`;

            case "IN": {

                if (!Array.isArray(filter.value)) {
                    throw new Error(
                        `${column} IN requires array`
                    );
                }

                const inPlaceholders =
                    filter.value.map(val => {
                        values.push(val);
                        return `$${++paramCount}`;
                    });

                return `${column} IN (${inPlaceholders.join(", ")})`;
            }
            case "NOT IN": {

                if (!Array.isArray(filter.value)) {
                    throw new Error(
                        `${column} NOT IN requires array`
                    );
                }

                const notInPlaceholders =
                    filter.value.map(val => {
                        values.push(val);
                        return `$${++paramCount}`;
                    });

                return `${column} NOT IN (${notInPlaceholders.join(", ")})`;
            }
            case "IS NULL":
                return `${column} IS NULL`;

            case "IS NOT NULL":
                return `${column} IS NOT NULL`;

            default:
                throw new Error(
                    `Unsupported operator: ${operator}`
                );
        }
    };

    //--------------------------------------------------
    // WHERE CONDITIONS
    //--------------------------------------------------

    const whereConditions = [
        "lr.rn = 1"
    ];

    filters.forEach(filter => {

        //----------------------------------------------
        // GROUP FILTER
        //----------------------------------------------

        if (
            filter.group &&
            Array.isArray(filter.group)
        ) {

            const groupParts = [];

            filter.group.forEach((item, index) => {

                const sql =
                    buildFilter(item);

                if (index === 0) {
                    groupParts.push(sql);
                } else {
                    groupParts.push(
                        `${item.condition || "OR"} ${sql}`
                    );
                }

            });

            whereConditions.push(
                `(${groupParts.join(" ")})`
            );

            return;
        }

        //----------------------------------------------
        // NORMAL FILTER
        //----------------------------------------------

        whereConditions.push(
            buildFilter(filter)
        );

    });

    //--------------------------------------------------
    // JOINS
    //--------------------------------------------------

    const joinSql = joins
        .map(join => `
            ${(join.type || "LEFT").toUpperCase()} JOIN ${join.table}
            ON ${join.on}
        `)
        .join("\n");

    //--------------------------------------------------
    // ORDER BY
    //--------------------------------------------------

    const orderClause = orderBy
        ? `ORDER BY ${orderBy}`
        : `ORDER BY lr.${timestampColumn} DESC`;

    //--------------------------------------------------
    // PAGINATION
    //--------------------------------------------------

    const offset =
        (pageNo - 1) * pageSize;

    //--------------------------------------------------
    // CTE
    //--------------------------------------------------

    const cte = `
        WITH latest_records AS (

            SELECT
                *,
                ROW_NUMBER() OVER (
                    PARTITION BY ${groupByColumn}
                    ORDER BY ${timestampColumn} DESC
                ) AS rn

            FROM ${tableName}

        )
    `;

    //--------------------------------------------------
    // DATA QUERY
    //--------------------------------------------------

    const dataQuery = {
        sql: `
            ${cte}

            SELECT
                ${selectColumns.join(", ")}

            FROM latest_records lr

            ${joinSql}

            WHERE
                ${whereConditions.join("\nAND ")}

            ${orderClause}

            LIMIT ${pageSize}
            OFFSET ${offset}
        `,
        params: [...values]
    };

    //--------------------------------------------------
    // COUNT QUERY
    //--------------------------------------------------

    const countQuery = {
        sql: `
            ${cte}

            SELECT
                COUNT(*) AS total

            FROM latest_records lr

            ${joinSql}

            WHERE
                ${whereConditions.join("\nAND ")}
        `,
        params: [...values]
    };

    return {
        dataQuery,
        countQuery
    };
};