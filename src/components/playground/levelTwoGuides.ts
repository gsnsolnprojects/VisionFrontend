import type { TourStep } from "./GuidedTour";

/**
 * The walkthroughs of Level 2. Level 1 has already explained what a dataset, a label, a split, a setting
 * and a score are, so these don't: they're about making good decisions on a real project.
 */

export const LEVEL_TWO_START_TOUR: TourStep[] = [
  {
    title: "This one is real",
    text: "In Level 1, GSN made the choices and nothing you did was saved. Here your photos, labels and training runs are real, and the result depends on your decisions. You know the basics, so this guide is about deciding well.",
  },
  {
    target: "l2-name",
    title: "Give the model one job",
    text: "A model does best with a narrow question. \"Find scratches on bottle caps\" is a good project. \"Find everything wrong with a bottle\" needs far more photos. Start narrow, and add more defects once that works.",
  },
  {
    target: "l2-scope",
    title: "20 photos is the minimum, not the goal",
    text: "20 lets you train, but it rarely gives a good model. Take photos the way the real camera would see the part: same distance, same lighting. Then vary what really changes, like position, batch and shadows.",
  },
  {
    target: "l2-upload",
    title: "Few photos make a weak exam",
    text: "Your labelled photos are split by themselves, and only about one in ten is kept for the test. From 20 photos that's just 2 or 3, so one lucky result can look like a great score. More photos make your test mean more.",
  },
  {
    target: "l2-gsn",
    title: "Using GSN's photos instead",
    text: "A fair way to try the full process. GSN's boxes don't come with them, so the model learns only from the ones you draw. Remember it will learn GSN's parts, not yours.",
  },
];

export const LEVEL_TWO_DATA_TOUR: TourStep[] = [
  {
    target: "l2-dataset",
    title: "Fix the data before the settings",
    text: "When a model does badly, the cause is usually its photos and labels, not its training settings. Most of your model's quality is decided on this page.",
  },
  {
    target: "l2-add",
    title: "Add what's missing, not more of the same",
    text: "Ten more photos of the same view add little. Add what the model hasn't seen: the rare defect, the darker shift, the other side of the part. And keep adding good parts, or it may start seeing defects everywhere.",
  },
  {
    target: "l2-first-photo",
    title: "Remove photos that teach the wrong thing",
    text: "Delete photos that are blurry, near copies of each other, or nothing like what the real camera will see. Fewer good photos beat more bad ones.",
  },
  {
    target: "l2-filters",
    title: "The groups can change",
    text: "Needs a label shows what's left to do. The group tags are set from your labelled photos, so labelling more can reshuffle them: a photo that was held out may move to training. Keep that in mind when you compare models later.",
  },
  {
    target: "l2-more",
    title: "Make extra copies last",
    text: "Copies add variety but nothing truly new, so they can't replace real photos. Make them after labelling, because changing your labels removes them. If left and right matter on your part, be careful: a flipped copy can teach something false.",
  },
  {
    target: "l2-next",
    title: "Your next move",
    text: "This takes you to the next photo to label, and to training once you have enough. Each Level 2 page has its own guide, and Show guide replays it.",
  },
];

export const LEVEL_TWO_LABELLING_TOUR: TourStep[] = [
  {
    title: "Nobody checks your boxes now",
    text: "In practice, every box was compared with GSN's. Here there's no answer to compare with. The model learns exactly what you draw, mistakes included, so you are now the one who decides what a defect is.",
  },
  {
    target: "label-categories",
    title: "Choose your labels carefully",
    text: "Make one label for each defect that looks different. If you can't tell two apart at a glance, the model probably can't either, so use one. Each extra label also needs its own examples, so keep the list short.",
  },
  {
    target: "label-canvas",
    title: "Set your rules, then keep them",
    text: "Decide how small a defect still counts and where a box should end, then do the same on every photo. Mark every defect you can see: one left unmarked teaches the model that it isn't a defect.",
  },
  {
    target: "label-nav",
    title: "Work faster",
    text: "This tool works differently from practice. Press W to draw and pick a label, or click an empty part of the photo. A and D move between photos, and Ctrl + scroll zooms. Your boxes save as you draw them.",
  },
  {
    target: "label-tools",
    title: "Copy boxes across similar photos",
    text: "With a fixed camera, parts often sit in the same place. Copy a photo's boxes, go to the next photo and press Ctrl + V. Always check them afterwards, because a pasted box on the wrong spot is a wrong lesson.",
  },
  {
    target: "label-save",
    title: "Careful with this question",
    text: "If any photos have no boxes, Save Annotations asks if they are good photos. Yes marks all of them as having no defect. Say Yes only if that's true of every one, or the model learns that real defects are fine.",
  },
];

export const LEVEL_TWO_TRAIN_TOUR: TourStep[] = [
  {
    title: "Training is an experiment",
    text: "You know what the settings mean. The skill now is using them: run, read the score, change one thing, run again. Change several at once and you won't know which one helped.",
  },
  {
    target: "train-numbers",
    title: "Check these before you spend a run",
    text: "A misspelt or unwanted label here will be learned as it is, so fix it in step 1 first. Look at the photo counts too: with very few to check itself on, the model's score can jump around and mean little.",
  },
  {
    target: "train-size",
    title: "Start with the small one",
    text: "Nano trains fastest, so you find problems in your photos and labels sooner. Try Small when better photos stop helping Nano. A bigger model can't make up for poor labels.",
  },
  {
    target: "train-settings",
    title: "When to change a setting",
    text: "The defaults are a good first run. Defects tiny in the photo? Raise image size, and lower batch size if asked. Score still climbing at the end? Add epochs. Score jumping up and down? Lower the learning rate.",
  },
  {
    target: "train-allowance",
    title: "Make each run count",
    text: "This is what you have left. Plan each run around one question, like \"does a larger image size find the small defects?\" If you run out of model slots, delete your weakest model.",
  },
  {
    target: "train-start",
    title: "Start it, then watch the score",
    text: "You can leave and come back. If you stay, watch the current score: where it levels off tells you if more epochs would be worth it next time.",
  },
  {
    target: "train-models",
    title: "Don't trust the score alone yet",
    text: "Each finished run lands here with its score. It comes from photos the model checked itself on, and was used to pick its best version. So treat it as a hint: the test in the next step is the real evidence.",
  },
];

export const LEVEL_TWO_TEST_TOUR: TourStep[] = [
  {
    title: "Now it's your model on trial",
    text: "In Level 1, a bad result was GSN's model. Here it's feedback on your own photos and labels, and that makes a bad result useful: it tells you what to fix.",
  },
  {
    target: "test-model",
    title: "Comparing your models",
    text: "If you've trained more than one, test them on the same photos. Use your own uploaded photos for this: the held-out group can change when you label more, so an older model may already have learned from some of them.",
  },
  {
    target: "test-photos",
    title: "Use both kinds of photo",
    text: "Held-out photos come with right answers, but they're few and look like your training photos. New photos are the tougher check: try another day, another light, another batch. If only those fail, your dataset is too uniform.",
  },
  {
    target: "test-run",
    title: "Choose photos with a purpose",
    text: "Each photo uses one of your monthly predictions, so pick ones that answer a question, such as whether it copes with dark photos. Include some good parts to see if it raises false alarms.",
  },
];

export const LEVEL_TWO_RESULTS_TOUR: TourStep[] = [
  {
    target: "result-first",
    title: "Look for patterns, not single mistakes",
    text: "One error tells you little. Are the misses all small defects? All dark photos? All one kind of defect? A pattern tells you exactly what to add. A box shows only if the model is at least 0.25 sure, so a miss may be a weak guess.",
  },
  {
    target: "result-compare",
    title: "This list isn't the whole answer",
    text: "These lines show which kinds of defect were found, not where. Both can say \"scratch\" while the box sits on the wrong spot, so check the photo too. And if the labels look wrong here, the mistake may be in your labelling.",
  },
  {
    title: "From result to fix",
    text: "Misses a defect: add more photos of it. Boxes on good parts: add more good parts. Mixes up two defects: check those labels, or merge them. Good here but bad on new photos: add more varied photos. Then train again.",
  },
  {
    target: "result-actions",
    title: "Improve first, or report now?",
    text: "A report closes this test and finishes this step, and either choice deletes the test's photos. If there's a clear fix, you may prefer to make it and train again first, so that your report shows your better model.",
  },
];

export const LEVEL_TWO_REPORT_TOUR: TourStep[] = [
  {
    target: "report-list",
    title: "Read it as someone who wasn't there",
    text: "A report answers one question for someone who never saw your project: can this model be trusted on the line? Reading yours as that person is your last check.",
  },
  {
    target: "report-download",
    title: "Be honest about what it shows",
    text: "Check which model it names and how many photos it covers. If that's only a few, say so when you share it. Download within 24 hours: after that, the PDF and the Excel file linked inside it are gone.",
  },
  {
    title: "A model is never really finished",
    text: "Real inspection teams repeat this loop: find what the model misses, add those photos, label, train and test again. You can go back to step 1 and do the same to make your model better.",
  },
];
