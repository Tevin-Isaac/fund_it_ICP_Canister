import {
  Principal,
  text,
  $query,
  $update,
  StableBTreeMap,
  Result,
  match,
  Vec,
  ic,
} from "azle";
import { Campaign, Donor } from "./types";

const generateId = () => ("" + Math.random()).substring(2, 7);

// campaignStorage: The storage that stores all the campaigns
const campaignStorage = new StableBTreeMap<string, Campaign>(0, 44, 1024);

/**
 * Creates a new campaign.
 *
 * @param _proposer - The proposer of the campaign.
 * @param _title - The title of the campaign.
 * @param _description - The description of the campaign.
 * @param _goal - The goal amount of the campaign.
 * @param _deadline - This is the deadline for the campaign, to make simple we will take the input from the user in days.
 *        if he enters 10 it means current time + 10 days will be the deadline.
 * @returns A result object containing the created campaign or an error string.
 */
$update;
export function createCampaign(
  _proposer: Principal,
  _title: text,
  _description: text,
  _goal: number,
  _deadline: number
): Result<Campaign, string> {
  try {
    if (!_proposer) {
      return Result.Err<Campaign, string>("Proposer is required");
    }
    if (!_title || _title.trim().length === 0) {
      return Result.Err<Campaign, string>("Title is required");
    }
    if (!_description || _description.trim().length === 0) {
      return Result.Err<Campaign, string>("Description is required");
    }
    if (!_goal || _goal <= 0) {
      return Result.Err<Campaign, string>("Goal should be greater than 0");
    }

    const presentTime = Number(ic.time());
    const nanoSeconds = Number(_deadline * 86400 * 1_000_000_000);
    const endDate = presentTime + nanoSeconds;

    const campaign: Campaign = {
      id: generateId(),
      proposer: _proposer,
      title: _title,
      description: _description,
      goal: _goal,
      totalDonations: 0,
      deadline: endDate,
      donors: [] as Vec<Donor>,
    };

    campaignStorage.insert(campaign.id, campaign);
    return Result.Ok(campaign);
  } catch (err) {
    if (err instanceof Error) {
      return Result.Err<Campaign, string>(
        `Failed to create campaign: ${err.message}`
      );
    } else {
      return Result.Err<Campaign, string>(
        "Failed to create campaign: Unexpected error, Please try again later"
      );
    }
  }
}

/**
 * Updates the title and description of a campaign by its ID.
 *
 * @param _campaignId - The ID of the campaign to update.
 * @param _title - The new title of the campaign.
 * @param _description - The new description of the campaign.
 * @returns A result object containing the updated campaign or an error string.
 */
$update;
export function updateOnlyTitleandDescription(
  _campaignId: string,
  _title: string,
  _description: string
): Result<Campaign, string> {
  return match(campaignStorage.get(_campaignId), {
    Some: (campaign) => {
      campaign.title = _title;
      campaign.description = _description;
      campaignStorage.insert(_campaignId, campaign);
      return Result.Ok<Campaign, string>(campaign);
    },
    None: () =>
      Result.Err<Campaign, string>(
        `the campaign with id=${_campaignId} is not found`
      ),
  });
}

/**
 * Donates a certain amount to a campaign by a donor.
 *
 * @param _campaignId - The ID of the campaign to donate to.
 * @param _donorId - The ID of the donor.
 * @param _amount - The amount to donate.
 * @returns A result object containing the updated campaign or an error string.
 *
 * If the campaign passes the deadline then it will give an Campaign has ended error,
 * if goal is crossed then it will give the maximum goal crossed error.
 */
$update;
export function donateCampaign(
  _campaignId: string,
  _donorId: Principal,
  _amount: number
): Result<Campaign, string> {
  return match(campaignStorage.get(_campaignId), {
    Some: (campaign) => {
      if (Number(ic.time()) > Number(campaign.deadline)) {
        return Result.Err<Campaign, string>("This campaign has ended");
      }
      const newDonor: Donor = { id: _donorId, amount: _amount };
      campaign.donors.push(newDonor);
      if (campaign.goal >= campaign.totalDonations + _amount) {
        campaign.totalDonations += _amount;
      } else {
        return Result.Err<Campaign, string>(
          `Donation amount is greater than the goal`
        );
      }
      campaignStorage.insert(_campaignId, campaign);
      return Result.Ok<Campaign, string>(campaign);
    },
    None: () =>
      Result.Err<Campaign, string>(
        `the campaign with id=${_campaignId} is not found`
      ),
  });
}

/**
 * Gets a campaign by its ID.
 *
 * @param id - The ID of the campaign to get.
 * @returns A result object containing the campaign or an error string.
 */
$query;
export function getCampaign(id: string): Result<Campaign, string> {
  return match(campaignStorage.get(id), {
    Some: (campaign) => Result.Ok<Campaign, string>(campaign),
    None: () =>
      Result.Err<Campaign, string>(`the campaign with id=${id} is not found`),
  });
}

/**
 * Gets the deadline of a campaign by its ID.
 *
 * @param id - The ID of the campaign to get the deadline for.
 * @returns A result object containing the deadline or an error string.
 */
$query;
export function getDeadlineByCampaignId(id: string): Result<number, string> {
  return match(campaignStorage.get(id), {
    Some: (campaign) => Result.Ok<number, string>(campaign.deadline),
    None: () => Result.Err<number, string>("bhvbsdkv")
  });
}

/**
 * Deletes a campaign by its ID.
 *
 * @param id - The ID of the campaign to delete.
 * @returns A result object containing the campaign or an error string.
 */
$update;
export function deleteCampaign(id: string): Result<Campaign, string> {
  return match(campaignStorage.remove(id), {
    Some: (deletedCampaign) => Result.Ok<Campaign, string>(deletedCampaign),
    None: () =>
      Result.Err<Campaign, string>(`the campaign with id=${id} is not found`),
  });
}

/**
 * Adds a new donor to an existing campaign by its ID.
 *
 * @param _campaignId - The ID of the campaign to add a donor to.
 * @param _donor - The donor object to add.
 * @returns A result object containing the updated campaign or an error string.
 */
$update;
export function addDonorToCampaign(
  _campaignId: string,
  _donor: Donor
): Result<Campaign, string> {
  return match(campaignStorage.get(_campaignId), {
    Some: (campaign) => {
      campaign.donors.push(_donor);
      campaignStorage.insert(_campaignId, campaign);
      return Result.Ok<Campaign, string>(campaign);
    },
    None: () =>
      Result.Err<Campaign, string>(
        `the campaign with id=${_campaignId} is not found`
      ),
  });
}

/**
 * Retrieves the list of all campaigns.
 *
 * @returns A result object containing a list of all campaigns or an error string.
 */
$query;
export function getAllCampaigns(): Result<Vec<Campaign>, string> {
  const campaigns: Vec<Campaign> = [];
  for (const [id, campaign] of campaignStorage.entries()) {
    campaigns.push(campaign);
  }
  return Result.Ok<Vec<Campaign>, string>(campaigns);
}

/**
 * Checks if a campaign has reached its donation goal.
 *
 * @param _campaignId - The ID of the campaign to check.
 * @returns A result object indicating whether the campaign has reached its goal or an error string.
 */
$query;
export function hasCampaignReachedGoal(_campaignId: string): Result<boolean, string> {
  return match(campaignStorage.get(_campaignId), {
    Some: (campaign) => {
      return Result.Ok<boolean, string>(campaign.totalDonations >= campaign.goal);
    },
    None: () =>
      Result.Err<boolean, string>(
        `the campaign with id=${_campaignId} is not found`
      ),
  });
}

/**
 * Retrieves the list of donors for a specific campaign.
 *
 * @param _campaignId - The ID of the campaign to get donors for.
 * @returns A result object containing the list of donors or an error string.
 */
$query;
export function getDonorsForCampaign(_campaignId: string): Result<Vec<Donor>, string> {
  return match(campaignStorage.get(_campaignId), {
    Some: (campaign) => {
      return Result.Ok<Vec<Donor>, string>(campaign.donors);
    },
    None: () =>
      Result.Err<Vec<Donor>, string>(
        `the campaign with id=${_campaignId} is not found`
      ),
  });
}

/**
 * Updates the deadline of a campaign by its ID.
 *
 * @param _campaignId - The ID of the campaign to update the deadline for.
 * @param _newDeadline - The new deadline in days.
 * @returns A result object containing the updated campaign or an error string.
 */
$update;
export function updateCampaignDeadline(_campaignId: string, _newDeadline: number): Result<Campaign, string> {
  return match(campaignStorage.get(_campaignId), {
    Some: (campaign) => {
      const presentTime = Number(ic.time());
      const nanoSeconds = Number(_newDeadline * 86400 * 1_000_000_000);
      const newDeadline = presentTime + nanoSeconds;
      campaign.deadline = newDeadline;
      campaignStorage.insert(_campaignId, campaign);
      return Result.Ok<Campaign, string>(campaign);
    },
    None: () =>
      Result.Err<Campaign, string>(
        `the campaign with id=${_campaignId} is not found`
      ),
  });
}

/**
 * Checks if a campaign has ended based on its current status.
 *
 * @param _campaignId - The ID of the campaign to check.
 * @returns A result object indicating whether the campaign has ended or an error string.
 */
$query;
export function hasCampaignEnded(_campaignId: string): Result<boolean, string> {
  return match(campaignStorage.get(_campaignId), {
    Some: (campaign) => {
      return Result.Ok<boolean, string>(Number(ic.time()) > Number(campaign.deadline));
    },
    None: () =>
      Result.Err<boolean, string>(
        `the campaign with id=${_campaignId} is not found`
      ),
  });
}
