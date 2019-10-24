import { Router, RequestHandler } from "express";
import bodyParser from "body-parser";
import { Model } from "sequelize";

export enum ActionType {
  GET_LIST = "GET_LIST",
  GET_ONE = "GET_ONE",
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE"
}

export const crud = <M extends Model>(
  resource: string,
  model: { new (): M } & typeof Model,
  actionTypes: ActionType[]
) => {
  const router = Router();
  router.use(bodyParser.json());

  for (const actionType of actionTypes) {
    switch (actionType) {
      case ActionType.GET_LIST:
        router.get(resource, getList(model));
        break;
      case ActionType.GET_ONE:
        router.get(`${resource}/:id`, getOne(model));
        break;
      case ActionType.CREATE:
        router.post(resource, create(model));
        break;
      case ActionType.UPDATE:
        router.put(`${resource}/:id`, update(model));
        break;
      case ActionType.DELETE:
        router.delete(`${resource}/:id`, destroy(model));
        break;
      default:
        throw new Error(`Unknown action type ${actionType}`);
    }
  }
  return router;
};

const getList = <M extends Model>(
  model: { new (): M } & typeof Model
): RequestHandler => async (req, res, next) => {
  try {
    const { range, sort, filter } = req.query;

    const [from, to] = range ? JSON.parse(range) : [0, 100];

    const { count, rows } = await model.findAndCountAll({
      offset: from,
      limit: to - from + 1,
      order: [sort ? JSON.parse(sort) : ["id", "ASC"]],
      where: filter ? JSON.parse(filter) : {},
      raw: true
    });

    res.set("Content-Range", `${from}-${from + rows.length}/${count}`);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

const getOne = <M extends Model>(
  model: { new (): M } & typeof Model
): RequestHandler => async (req, res, next) => {
  try {
    const record = await model.findByPk(req.params.id, {
      raw: true
    });

    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json(record);
  } catch (error) {
    next(error);
  }
};

const create = <M extends Model>(
  model: { new (): M } & typeof Model
): RequestHandler => async (req, res, next) => {
  try {
    const record = await model.create(req.body, { raw: true });
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
};

const update = <M extends Model>(
  model: { new (): M } & typeof Model
): RequestHandler => async (req, res, next) => {
  try {
    const record = await model.findByPk(req.params.id);

    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json(
      await model.update(req.body, {
        where: { id: req.params.id },
        returning: true
      })
    );
  } catch (error) {
    next(error);
  }
};

const destroy = <M extends Model>(
  model: { new (): M } & typeof Model
): RequestHandler => async (req, res, next) => {
  try {
    await model.destroy({ where: { id: req.params.id } });
    res.json({ id: req.params.id });
  } catch (error) {
    next(error);
  }
};
